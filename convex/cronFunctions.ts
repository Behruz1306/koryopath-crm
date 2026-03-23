import { internalMutation } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Check all tasks with status "pending" or "in_progress" where dueDate < now.
 * Mark them as "overdue" and notify boss users.
 */
export const checkOverdueTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get pending tasks that are past due
    const pendingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const inProgressTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();

    const overdueTasks = [...pendingTasks, ...inProgressTasks].filter(
      (t) => t.dueDate < now
    );

    if (overdueTasks.length === 0) return;

    // Get all boss users for notifications
    const bossUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "boss"))
      .collect();

    for (const task of overdueTasks) {
      // Mark task as overdue
      await ctx.db.patch(task._id, { status: "overdue" });

      // Notify each boss
      for (const boss of bossUsers) {
        await ctx.db.insert("notifications", {
          userId: boss._id,
          type: "task_overdue",
          title: "Просроченная задача",
          message: `Задача "${task.title}" просрочена. Агент должен выполнить её.`,
          isRead: false,
          priority: "high",
          link: `/tasks/${task._id}`,
        });
      }

      // Notify the assigned agent
      await ctx.db.insert("notifications", {
        userId: task.agentId,
        type: "task_overdue",
        title: "Задача просрочена",
        message: `Ваша задача "${task.title}" просрочена. Пожалуйста, завершите её как можно скорее.`,
        isRead: false,
        priority: "high",
        link: `/tasks/${task._id}`,
      });
    }
  },
});

/**
 * Check documents approaching expiry (30/15/7/3/1 days) and already expired.
 * Create notifications for agent and boss.
 */
export const checkExpiringDocuments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all documents that have an expiryDate and are not already expired
    const allDocuments = await ctx.db.query("documents").collect();
    const docsWithExpiry = allDocuments.filter(
      (d) => d.expiryDate && d.status !== "expired"
    );

    const bossUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "boss"))
      .collect();

    const thresholds = [30, 15, 7, 3, 1];

    for (const doc of docsWithExpiry) {
      const expiryTime = new Date(doc.expiryDate!).getTime();
      const daysUntilExpiry = Math.ceil((expiryTime - now) / DAY_MS);

      // If already expired, mark as expired
      if (daysUntilExpiry < 0) {
        await ctx.db.patch(doc._id, { status: "expired" });

        // Get student to find agent
        const student = await ctx.db.get(doc.studentId);
        if (student) {
          await ctx.db.insert("notifications", {
            userId: student.agentId,
            type: "document_expired",
            title: "Документ истёк",
            message: `Документ "${doc.type}" студента ${student.firstNameRu} ${student.lastNameRu} истёк.`,
            isRead: false,
            priority: "critical",
            link: `/students/${student._id}/documents`,
          });

          for (const boss of bossUsers) {
            await ctx.db.insert("notifications", {
              userId: boss._id,
              type: "document_expired",
              title: "Документ истёк",
              message: `Документ "${doc.type}" студента ${student.firstNameRu} ${student.lastNameRu} истёк.`,
              isRead: false,
              priority: "critical",
              link: `/students/${student._id}/documents`,
            });
          }
        }
        continue;
      }

      // Check if days until expiry matches any threshold
      if (thresholds.includes(daysUntilExpiry)) {
        const student = await ctx.db.get(doc.studentId);
        if (!student) continue;

        const priorityMap: Record<number, "low" | "normal" | "high" | "critical"> = {
          30: "low",
          15: "normal",
          7: "high",
          3: "high",
          1: "critical",
        };

        const priority = priorityMap[daysUntilExpiry] ?? "normal";

        // Notify agent
        await ctx.db.insert("notifications", {
          userId: student.agentId,
          type: "document_expiring",
          title: "Документ скоро истекает",
          message: `Документ "${doc.type}" студента ${student.firstNameRu} ${student.lastNameRu} истекает через ${daysUntilExpiry} дн.`,
          isRead: false,
          priority,
          link: `/students/${student._id}/documents`,
        });

        // Notify boss
        for (const boss of bossUsers) {
          await ctx.db.insert("notifications", {
            userId: boss._id,
            type: "document_expiring",
            title: "Документ скоро истекает",
            message: `Документ "${doc.type}" студента ${student.firstNameRu} ${student.lastNameRu} истекает через ${daysUntilExpiry} дн.`,
            isRead: false,
            priority,
            link: `/students/${student._id}/documents`,
          });
        }
      }
    }
  },
});

/**
 * Escalate penalties for overdue tasks based on how many days overdue:
 * 1-2 days: auto warning notification (no penalty record)
 * 3-5 days: warning_1 penalty if not already issued
 * 6-10 days: warning_2 penalty if not already issued
 * >10 days: notify boss for manual fine
 */
export const escalatePenalties = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const overdueTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "overdue"))
      .collect();

    if (overdueTasks.length === 0) return;

    const bossUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "boss"))
      .collect();

    // Get all existing penalties to check for duplicates
    const allPenalties = await ctx.db.query("penalties").collect();

    for (const task of overdueTasks) {
      const daysOverdue = Math.floor((now - task.dueDate) / DAY_MS);
      if (daysOverdue < 1) continue;

      const taskPenalties = allPenalties.filter(
        (p) => p.relatedTaskId === task._id
      );

      if (daysOverdue <= 2) {
        // 1-2 days: auto warning notification, no penalty record
        // Only send once per day — check if notification already exists today
        await ctx.db.insert("notifications", {
          userId: task.agentId,
          type: "auto_warning",
          title: "Автопредупреждение",
          message: `Задача "${task.title}" просрочена на ${daysOverdue} дн. Выполните задачу, чтобы избежать штрафов.`,
          isRead: false,
          priority: "high",
          link: `/tasks/${task._id}`,
        });
      } else if (daysOverdue <= 5) {
        // 3-5 days: warning_1
        const hasWarning1 = taskPenalties.some(
          (p) => p.type === "warning_1"
        );
        if (!hasWarning1) {
          // Find a boss to be the issuer (system-issued)
          const issuerId = bossUsers[0]?._id ?? task.createdById;

          await ctx.db.insert("penalties", {
            agentId: task.agentId,
            issuedById: issuerId,
            type: "warning_1",
            reason: `Автоматическое предупреждение 1: задача "${task.title}" просрочена на ${daysOverdue} дней.`,
            relatedTaskId: task._id,
            relatedStudentId: task.studentId,
            issuedAt: now,
          });

          await ctx.db.insert("notifications", {
            userId: task.agentId,
            type: "penalty_warning_1",
            title: "Предупреждение 1",
            message: `Вам выписано предупреждение 1 за просрочку задачи "${task.title}" (${daysOverdue} дн).`,
            isRead: false,
            priority: "high",
            link: `/tasks/${task._id}`,
          });
        }
      } else if (daysOverdue <= 10) {
        // 6-10 days: warning_2
        const hasWarning2 = taskPenalties.some(
          (p) => p.type === "warning_2"
        );
        if (!hasWarning2) {
          const issuerId = bossUsers[0]?._id ?? task.createdById;

          // Ensure warning_1 exists first
          const hasWarning1 = taskPenalties.some(
            (p) => p.type === "warning_1"
          );
          if (!hasWarning1) {
            await ctx.db.insert("penalties", {
              agentId: task.agentId,
              issuedById: issuerId,
              type: "warning_1",
              reason: `Автоматическое предупреждение 1: задача "${task.title}" просрочена на ${daysOverdue} дней.`,
              relatedTaskId: task._id,
              relatedStudentId: task.studentId,
              issuedAt: now,
            });
          }

          await ctx.db.insert("penalties", {
            agentId: task.agentId,
            issuedById: issuerId,
            type: "warning_2",
            reason: `Автоматическое предупреждение 2: задача "${task.title}" просрочена на ${daysOverdue} дней.`,
            relatedTaskId: task._id,
            relatedStudentId: task.studentId,
            issuedAt: now,
          });

          await ctx.db.insert("notifications", {
            userId: task.agentId,
            type: "penalty_warning_2",
            title: "Предупреждение 2",
            message: `Вам выписано предупреждение 2 за просрочку задачи "${task.title}" (${daysOverdue} дн). Следующий шаг — штраф.`,
            isRead: false,
            priority: "critical",
            link: `/tasks/${task._id}`,
          });
        }
      } else {
        // >10 days: notify all bosses for manual fine
        for (const boss of bossUsers) {
          await ctx.db.insert("notifications", {
            userId: boss._id,
            type: "penalty_needs_fine",
            title: "Требуется ручной штраф",
            message: `Задача "${task.title}" просрочена на ${daysOverdue} дн. Агенту необходимо выписать штраф вручную.`,
            isRead: false,
            priority: "critical",
            link: `/tasks/${task._id}`,
          });
        }
      }
    }
  },
});
