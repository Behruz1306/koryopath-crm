import { mutation } from "./_generated/server";
import bcrypt from "bcryptjs";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingUsers = await ctx.db.query("users").first();
    if (existingUsers) {
      return { success: false, message: "Database already seeded. Skipping." };
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // ==========================================
    // 1. Create Boss user
    // ==========================================
    const bossPasswordHash = bcrypt.hashSync("Koryopath2024!", 10);
    const bossId = await ctx.db.insert("users", {
      email: "boss@koryopath.com",
      passwordHash: bossPasswordHash,
      nameRu: "Администратор KoryoPath",
      nameKo: "관리자",
      nameEn: "KoryoPath Admin",
      role: "boss",
      languagePreference: "ru",
      isActive: true,
      lastLogin: now,
    });

    // ==========================================
    // 2. Create 4 branches
    // ==========================================
    const branchData = [
      { nameRu: "Ташкент", nameEn: "Tashkent", city: "Ташкент", address: "ул. Амира Темура 68", phone: "+998 71 123 4567", email: "tashkent@koryopath.com" },
      { nameRu: "Самарканд", nameEn: "Samarkand", city: "Самарканд", address: "ул. Регистан 12", phone: "+998 66 234 5678", email: "samarkand@koryopath.com" },
      { nameRu: "Фергана", nameEn: "Fergana", city: "Фергана", address: "ул. Навои 45", phone: "+998 73 345 6789", email: "fergana@koryopath.com" },
      { nameRu: "Бухара", nameEn: "Bukhara", city: "Бухара", address: "ул. Ибн Сино 23", phone: "+998 65 456 7890", email: "bukhara@koryopath.com" },
    ];

    const branchIds = [];
    for (const b of branchData) {
      const id = await ctx.db.insert("branches", b);
      branchIds.push(id);
    }

    // ==========================================
    // 3. Create 4 agents
    // ==========================================
    const agentPasswordHash = bcrypt.hashSync("Agent2024!", 10);
    const agentData = [
      { email: "tashkent@koryopath.com", nameRu: "Фарход Исмаилов", nameEn: "Farkhod Ismailov", branchIdx: 0 },
      { email: "samarkand@koryopath.com", nameRu: "Дилноза Каримова", nameEn: "Dilnoza Karimova", branchIdx: 1 },
      { email: "fergana@koryopath.com", nameRu: "Жасур Рахимов", nameEn: "Jasur Rakhimov", branchIdx: 2 },
      { email: "bukhara@koryopath.com", nameRu: "Нодира Хасанова", nameEn: "Nodira Khasanova", branchIdx: 3 },
    ];

    const agentIds = [];
    for (const a of agentData) {
      const id = await ctx.db.insert("users", {
        email: a.email,
        passwordHash: agentPasswordHash,
        nameRu: a.nameRu,
        nameEn: a.nameEn,
        role: "branch_agent",
        branchId: branchIds[a.branchIdx],
        languagePreference: "ru",
        isActive: true,
        lastLogin: now - 3600000,
      });
      agentIds.push(id);

      // Link agent to branch
      await ctx.db.patch(branchIds[a.branchIdx], { agentId: id });
    }

    // ==========================================
    // 4. Create 50 universities
    // ==========================================
    const universities = [
      { nameKo: "서울대학교", nameEn: "Seoul National University", nameRu: "Сеульский национальный университет", city: "Seoul", tier: "SKY" as const, website: "https://www.snu.ac.kr", tuitionPerSemesterUsd: 2500, dormitoryAvailable: true, dormitoryCostUsd: 600, uzbekStudentsCount: 85, acceptanceRateUzbek: 15, topikMin: 5, springDeadline: "2026-09-15", fallDeadline: "2026-05-15", programs: ["Engineering", "Natural Sciences", "Humanities", "Social Sciences", "Business Administration", "Medicine"], notesRu: "Лучший университет Кореи. Высокие требования, но хорошие стипендии." },
      { nameKo: "연세대학교", nameEn: "Yonsei University", nameRu: "Университет Ёнсе", city: "Seoul", tier: "SKY" as const, website: "https://www.yonsei.ac.kr", tuitionPerSemesterUsd: 4500, dormitoryAvailable: true, dormitoryCostUsd: 700, uzbekStudentsCount: 72, acceptanceRateUzbek: 18, topikMin: 5, springDeadline: "2026-09-20", fallDeadline: "2026-05-20", programs: ["Business", "Engineering", "Life Sciences", "International Studies", "Korean Language", "Music"], notesRu: "Престижный частный. Программа Global Village для иностранцев." },
      { nameKo: "고려대학교", nameEn: "Korea University", nameRu: "Университет Корё", city: "Seoul", tier: "SKY" as const, website: "https://www.korea.ac.kr", tuitionPerSemesterUsd: 4200, dormitoryAvailable: true, dormitoryCostUsd: 650, uzbekStudentsCount: 65, acceptanceRateUzbek: 20, topikMin: 5, springDeadline: "2026-09-18", fallDeadline: "2026-05-18", programs: ["Law", "Business", "Engineering", "Political Science", "Computer Science", "Economics"], notesRu: "Один из TOP-3. Сильная бизнес-школа." },
      { nameKo: "한국과학기술원", nameEn: "KAIST", nameRu: "Корейский институт науки и технологий", city: "Daejeon", tier: "national" as const, website: "https://www.kaist.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 400, uzbekStudentsCount: 25, acceptanceRateUzbek: 10, topikMin: 4, springDeadline: "2026-09-10", fallDeadline: "2026-05-10", programs: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Physics", "Mathematics", "Bio Engineering"], notesRu: "Технический университет мирового уровня. Обучение на английском." },
      { nameKo: "포항공과대학교", nameEn: "POSTECH", nameRu: "Пхоханский технологический университет", city: "Pohang", tier: "national" as const, website: "https://www.postech.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 350, uzbekStudentsCount: 12, acceptanceRateUzbek: 8, topikMin: 4, springDeadline: "2026-09-05", fallDeadline: "2026-05-05", programs: ["Physics", "Chemistry", "Materials Science", "Computer Science", "Industrial Engineering"], notesRu: "Маленький, но элитный технический вуз." },
      { nameKo: "성균관대학교", nameEn: "Sungkyunkwan University", nameRu: "Университет Сонгюнгван", city: "Seoul", tier: "private_top" as const, website: "https://www.skku.edu", tuitionPerSemesterUsd: 4000, dormitoryAvailable: true, dormitoryCostUsd: 600, uzbekStudentsCount: 95, acceptanceRateUzbek: 30, topikMin: 4, springDeadline: "2026-10-01", fallDeadline: "2026-06-01", programs: ["Business", "Engineering", "Computer Science", "Korean Literature", "Economics", "Pharmacy"], notesRu: "Партнёр Samsung. Современный кампус и хорошие стипендии." },
      { nameKo: "한양대학교", nameEn: "Hanyang University", nameRu: "Университет Ханъян", city: "Seoul", tier: "private_top" as const, website: "https://www.hanyang.ac.kr", tuitionPerSemesterUsd: 3800, dormitoryAvailable: true, dormitoryCostUsd: 550, uzbekStudentsCount: 130, acceptanceRateUzbek: 35, topikMin: 4, springDeadline: "2026-10-05", fallDeadline: "2026-06-05", programs: ["Engineering", "Architecture", "Music", "Theater", "Business", "Medicine"], notesRu: "Сильнейший инженерный вуз. Много узбекских студентов." },
      { nameKo: "서강대학교", nameEn: "Sogang University", nameRu: "Университет Соган", city: "Seoul", tier: "private_top" as const, website: "https://www.sogang.ac.kr", tuitionPerSemesterUsd: 4100, dormitoryAvailable: true, dormitoryCostUsd: 600, uzbekStudentsCount: 40, acceptanceRateUzbek: 25, topikMin: 4, springDeadline: "2026-09-25", fallDeadline: "2026-05-25", programs: ["Business", "Economics", "International Studies", "Computer Science", "Philosophy", "Communication"], notesRu: "Небольшой престижный вуз. Сильная программа Korean Language." },
      { nameKo: "중앙대학교", nameEn: "Chung-Ang University", nameRu: "Университет Чунан", city: "Seoul", tier: "private_top" as const, website: "https://www.cau.ac.kr", tuitionPerSemesterUsd: 3700, dormitoryAvailable: true, dormitoryCostUsd: 500, uzbekStudentsCount: 88, acceptanceRateUzbek: 32, topikMin: 4, springDeadline: "2026-10-10", fallDeadline: "2026-06-10", programs: ["Film", "Theater", "Business", "Engineering", "Pharmacy", "Art"], notesRu: "Лучший вуз для кино и искусства в Корее." },
      { nameKo: "경희대학교", nameEn: "Kyung Hee University", nameRu: "Университет Кёнхи", city: "Seoul", tier: "private_top" as const, website: "https://www.khu.ac.kr", tuitionPerSemesterUsd: 3600, dormitoryAvailable: true, dormitoryCostUsd: 500, uzbekStudentsCount: 110, acceptanceRateUzbek: 35, topikMin: 3, springDeadline: "2026-10-15", fallDeadline: "2026-06-15", programs: ["Korean Medicine", "Hotel Management", "Business", "International Studies", "Korean Language", "Music"], notesRu: "Красивый кампус. Популярен среди узбекских студентов." },
      { nameKo: "한국외국어대학교", nameEn: "Hankuk University of Foreign Studies", nameRu: "Ханкукский университет иностранных языков", city: "Seoul", tier: "private_top" as const, website: "https://www.hufs.ac.kr", tuitionPerSemesterUsd: 3500, dormitoryAvailable: true, dormitoryCostUsd: 500, uzbekStudentsCount: 60, acceptanceRateUzbek: 28, topikMin: 4, springDeadline: "2026-10-01", fallDeadline: "2026-06-01", programs: ["Translation", "International Studies", "Business", "Korean Language", "Central Asian Studies", "Law"], notesRu: "Лучший лингвистический вуз. Есть кафедра узбекского языка." },
      { nameKo: "이화여자대학교", nameEn: "Ewha Womans University", nameRu: "Женский университет Ихва", city: "Seoul", tier: "private_top" as const, website: "https://www.ewha.ac.kr", tuitionPerSemesterUsd: 3800, dormitoryAvailable: true, dormitoryCostUsd: 550, uzbekStudentsCount: 45, acceptanceRateUzbek: 22, topikMin: 4, springDeadline: "2026-09-30", fallDeadline: "2026-05-30", programs: ["Business", "Education", "Art", "Music", "International Studies", "Engineering"], notesRu: "Престижный женский университет. Мужчины могут учиться в магистратуре." },
      { nameKo: "건국대학교", nameEn: "Konkuk University", nameRu: "Университет Конгук", city: "Seoul", tier: "private_top" as const, website: "https://www.konkuk.ac.kr", tuitionPerSemesterUsd: 3500, dormitoryAvailable: true, dormitoryCostUsd: 500, uzbekStudentsCount: 95, acceptanceRateUzbek: 38, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Veterinary", "Business", "Architecture", "Film", "Design", "Engineering"], notesRu: "Красивый кампус у озера. Сильная ветеринарная программа." },
      { nameKo: "동국대학교", nameEn: "Dongguk University", nameRu: "Университет Тонгук", city: "Seoul", tier: "private_top" as const, website: "https://www.dongguk.edu", tuitionPerSemesterUsd: 3400, dormitoryAvailable: true, dormitoryCostUsd: 480, uzbekStudentsCount: 70, acceptanceRateUzbek: 33, topikMin: 3, springDeadline: "2026-10-10", fallDeadline: "2026-06-10", programs: ["Film", "Police Administration", "Buddhist Studies", "Business", "IT", "Theater"], notesRu: "Буддийский университет. Рядом с Намсан в центре Сеула." },
      { nameKo: "국민대학교", nameEn: "Kookmin University", nameRu: "Университет Кукмин", city: "Seoul", tier: "private_mid" as const, website: "https://www.kookmin.ac.kr", tuitionPerSemesterUsd: 3200, dormitoryAvailable: true, dormitoryCostUsd: 450, uzbekStudentsCount: 55, acceptanceRateUzbek: 45, topikMin: 3, springDeadline: "2026-10-25", fallDeadline: "2026-06-25", programs: ["Automotive Engineering", "Design", "Business", "Architecture", "IT", "Economics"], notesRu: "Сильная программа автомобильного дизайна. Связи с Hyundai-Kia." },
      { nameKo: "세종대학교", nameEn: "Sejong University", nameRu: "Университет Сечжон", city: "Seoul", tier: "private_mid" as const, website: "https://www.sejong.ac.kr", tuitionPerSemesterUsd: 3100, dormitoryAvailable: true, dormitoryCostUsd: 450, uzbekStudentsCount: 80, acceptanceRateUzbek: 48, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Hotel Management", "Animation", "Computer Science", "Business", "Engineering", "Music"], notesRu: "Сильная программа гостиничного менеджмента и анимации." },
      { nameKo: "단국대학교", nameEn: "Dankook University", nameRu: "Университет Тангук", city: "Cheonan", tier: "private_mid" as const, website: "https://www.dankook.ac.kr", tuitionPerSemesterUsd: 2800, dormitoryAvailable: true, dormitoryCostUsd: 350, uzbekStudentsCount: 120, acceptanceRateUzbek: 55, topikMin: 3, springDeadline: "2026-11-01", fallDeadline: "2026-07-01", programs: ["Business", "Engineering", "Design", "Korean Language", "Sports Science", "Law"], notesRu: "Кампус в Чхонане. Дешевле, чем сеульские вузы. Много узбеков." },
      { nameKo: "숭실대학교", nameEn: "Soongsil University", nameRu: "Университет Сунсиль", city: "Seoul", tier: "private_mid" as const, website: "https://www.ssu.ac.kr", tuitionPerSemesterUsd: 3000, dormitoryAvailable: true, dormitoryCostUsd: 450, uzbekStudentsCount: 65, acceptanceRateUzbek: 42, topikMin: 3, springDeadline: "2026-10-15", fallDeadline: "2026-06-15", programs: ["IT", "Engineering", "Business", "Economics", "Social Science", "Law"], notesRu: "Христианский университет. Сильная IT-программа." },
      { nameKo: "광운대학교", nameEn: "Kwangwoon University", nameRu: "Университет Кванун", city: "Seoul", tier: "private_mid" as const, website: "https://www.kw.ac.kr", tuitionPerSemesterUsd: 3000, dormitoryAvailable: true, dormitoryCostUsd: 420, uzbekStudentsCount: 50, acceptanceRateUzbek: 50, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Electronics", "Computer Science", "Information Engineering", "Business", "Media", "Robotics"], notesRu: "Технический вуз. Сильная электроника и робототехника." },
      { nameKo: "명지대학교", nameEn: "Myongji University", nameRu: "Университет Мёнджи", city: "Seoul", tier: "private_mid" as const, website: "https://www.mju.ac.kr", tuitionPerSemesterUsd: 2900, dormitoryAvailable: true, dormitoryCostUsd: 400, uzbekStudentsCount: 45, acceptanceRateUzbek: 52, topikMin: 3, springDeadline: "2026-10-25", fallDeadline: "2026-06-25", programs: ["Architecture", "Business", "Engineering", "Art", "Music", "Korean Language"], notesRu: "Хорошая архитектурная программа. Два кампуса." },
      { nameKo: "상명대학교", nameEn: "Sangmyung University", nameRu: "Университет Санмён", city: "Seoul", tier: "private_mid" as const, website: "https://www.smu.ac.kr", tuitionPerSemesterUsd: 2900, dormitoryAvailable: true, dormitoryCostUsd: 400, uzbekStudentsCount: 40, acceptanceRateUzbek: 55, topikMin: 3, springDeadline: "2026-10-30", fallDeadline: "2026-06-30", programs: ["Design", "Animation", "Music", "Computer Science", "Business", "Education"], notesRu: "Сильные творческие программы. Дизайн и анимация." },
      { nameKo: "서울과학기술대학교", nameEn: "Seoul National University of Science and Technology", nameRu: "Сеульский технологический университет", city: "Seoul", tier: "national" as const, website: "https://www.seoultech.ac.kr", tuitionPerSemesterUsd: 2200, dormitoryAvailable: true, dormitoryCostUsd: 400, uzbekStudentsCount: 70, acceptanceRateUzbek: 35, topikMin: 3, springDeadline: "2026-10-01", fallDeadline: "2026-06-01", programs: ["Engineering", "Design", "IT", "Business", "Architecture", "Energy"], notesRu: "Государственный технический вуз. Низкая стоимость обучения." },
      { nameKo: "서울시립대학교", nameEn: "University of Seoul", nameRu: "Городской университет Сеула", city: "Seoul", tier: "national" as const, website: "https://www.uos.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 350, uzbekStudentsCount: 40, acceptanceRateUzbek: 25, topikMin: 4, springDeadline: "2026-09-25", fallDeadline: "2026-05-25", programs: ["Urban Planning", "Engineering", "Business", "Law", "Economics", "Computer Science"], notesRu: "Муниципальный вуз. Одна из самых низких стоимостей в Сеуле." },
      { nameKo: "인하대학교", nameEn: "Inha University", nameRu: "Университет Инха", city: "Incheon", tier: "private_top" as const, website: "https://www.inha.ac.kr", tuitionPerSemesterUsd: 3300, dormitoryAvailable: true, dormitoryCostUsd: 400, uzbekStudentsCount: 180, acceptanceRateUzbek: 45, topikMin: 3, springDeadline: "2026-10-15", fallDeadline: "2026-06-15", programs: ["Engineering", "Business", "International Trade", "IT", "Logistics", "Korean Language"], notesRu: "Основан при поддержке Узбекистана. Самое большое узбекское комьюнити." },
      { nameKo: "아주대학교", nameEn: "Ajou University", nameRu: "Университет Аджу", city: "Suwon", tier: "private_mid" as const, website: "https://www.ajou.ac.kr", tuitionPerSemesterUsd: 3000, dormitoryAvailable: true, dormitoryCostUsd: 400, uzbekStudentsCount: 55, acceptanceRateUzbek: 40, topikMin: 3, springDeadline: "2026-10-10", fallDeadline: "2026-06-10", programs: ["Engineering", "IT", "Business", "Medicine", "Korean Language", "Data Science"], notesRu: "Хороший технический вуз рядом с Сеулом, в Сувоне." },
      { nameKo: "성결대학교", nameEn: "Sungkyul University", nameRu: "Университет Сонгёль", city: "Anyang", tier: "private_mid" as const, website: "https://www.sungkyul.ac.kr", tuitionPerSemesterUsd: 2500, dormitoryAvailable: true, dormitoryCostUsd: 350, uzbekStudentsCount: 30, acceptanceRateUzbek: 65, topikMin: 2, springDeadline: "2026-11-01", fallDeadline: "2026-07-01", programs: ["Theology", "Business", "IT", "Social Welfare", "Music", "Korean Language"], notesRu: "Христианский университет. Доступные цены и высокий процент приёма." },
      { nameKo: "부산대학교", nameEn: "Pusan National University", nameRu: "Пусанский национальный университет", city: "Busan", tier: "national" as const, website: "https://www.pusan.ac.kr", tuitionPerSemesterUsd: 2200, dormitoryAvailable: true, dormitoryCostUsd: 350, uzbekStudentsCount: 90, acceptanceRateUzbek: 30, topikMin: 3, springDeadline: "2026-10-01", fallDeadline: "2026-06-01", programs: ["Engineering", "Business", "Marine Science", "Korean Language", "Medicine", "Law"], notesRu: "Лучший вуз Пусана. Город у моря, дешевле Сеула." },
      { nameKo: "경북대학교", nameEn: "Kyungpook National University", nameRu: "Кёнбукский национальный университет", city: "Daegu", tier: "national" as const, website: "https://www.knu.ac.kr", tuitionPerSemesterUsd: 2100, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 75, acceptanceRateUzbek: 35, topikMin: 3, springDeadline: "2026-10-05", fallDeadline: "2026-06-05", programs: ["Engineering", "Agriculture", "Business", "IT", "Medicine", "Korean Language"], notesRu: "Крупный университет Тэгу. Хорошие общежития." },
      { nameKo: "전남대학교", nameEn: "Chonnam National University", nameRu: "Чоннамский национальный университет", city: "Gwangju", tier: "national" as const, website: "https://www.jnu.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 60, acceptanceRateUzbek: 40, topikMin: 3, springDeadline: "2026-10-10", fallDeadline: "2026-06-10", programs: ["Engineering", "Agriculture", "Business", "Korean Language", "AI", "Medicine"], notesRu: "Гванджу — культурная столица. Доступные цены." },
      { nameKo: "충남대학교", nameEn: "Chungnam National University", nameRu: "Чхуннамский национальный университет", city: "Daejeon", tier: "national" as const, website: "https://www.cnu.ac.kr", tuitionPerSemesterUsd: 2100, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 55, acceptanceRateUzbek: 38, topikMin: 3, springDeadline: "2026-10-05", fallDeadline: "2026-06-05", programs: ["Engineering", "Business", "Agriculture", "Korean Language", "Chemistry", "Pharmacy"], notesRu: "Город науки Тэджон. Рядом с KAIST." },
      { nameKo: "충북대학교", nameEn: "Chungbuk National University", nameRu: "Чхунбукский национальный университет", city: "Cheongju", tier: "national" as const, website: "https://www.chungbuk.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 45, acceptanceRateUzbek: 42, topikMin: 3, springDeadline: "2026-10-15", fallDeadline: "2026-06-15", programs: ["Engineering", "Agriculture", "Business", "Korean Language", "Education", "Science"], notesRu: "Спокойный город Чхонджу. Недорогая жизнь." },
      { nameKo: "강원대학교", nameEn: "Kangwon National University", nameRu: "Канвонский национальный университет", city: "Chuncheon", tier: "national" as const, website: "https://www.kangwon.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 35, acceptanceRateUzbek: 45, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Forestry", "Agriculture", "Engineering", "Tourism", "Korean Language", "Bio Science"], notesRu: "Горный регион. Красивая природа. Популярен для туризма." },
      { nameKo: "제주대학교", nameEn: "Jeju National University", nameRu: "Чеджуский национальный университет", city: "Jeju", tier: "national" as const, website: "https://www.jejunu.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 30, acceptanceRateUzbek: 50, topikMin: 3, springDeadline: "2026-10-15", fallDeadline: "2026-06-15", programs: ["Tourism", "Marine Science", "Agriculture", "Korean Language", "Business", "Engineering"], notesRu: "Остров Чеджу. Курортный город. Уникальная атмосфера." },
      { nameKo: "경상대학교", nameEn: "Gyeongsang National University", nameRu: "Кёнсанский национальный университет", city: "Jinju", tier: "national" as const, website: "https://www.gnu.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 270, uzbekStudentsCount: 40, acceptanceRateUzbek: 45, topikMin: 3, springDeadline: "2026-10-10", fallDeadline: "2026-06-10", programs: ["Agriculture", "Engineering", "Veterinary", "Korean Language", "Business", "Nursing"], notesRu: "Южный регион. Тихий город Чинджу." },
      { nameKo: "전북대학교", nameEn: "Jeonbuk National University", nameRu: "Чонбукский национальный университет", city: "Jeonju", tier: "national" as const, website: "https://www.jbnu.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 50, acceptanceRateUzbek: 40, topikMin: 3, springDeadline: "2026-10-10", fallDeadline: "2026-06-10", programs: ["Engineering", "Agriculture", "Business", "Korean Language", "IT", "Medicine"], notesRu: "Чонджу — город традиционной культуры. Доступные цены." },
      { nameKo: "영남대학교", nameEn: "Yeungnam University", nameRu: "Университет Ёнам", city: "Gyeongsan", tier: "private_mid" as const, website: "https://www.yu.ac.kr", tuitionPerSemesterUsd: 2700, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 85, acceptanceRateUzbek: 50, topikMin: 3, springDeadline: "2026-10-25", fallDeadline: "2026-06-25", programs: ["Engineering", "Business", "Korean Language", "Design", "IT", "Pharmacy"], notesRu: "Крупный частный вуз рядом с Тэгу. Много иностранцев." },
      { nameKo: "계명대학교", nameEn: "Keimyung University", nameRu: "Университет Кемён", city: "Daegu", tier: "private_mid" as const, website: "https://www.kmu.ac.kr", tuitionPerSemesterUsd: 2800, dormitoryAvailable: true, dormitoryCostUsd: 320, uzbekStudentsCount: 65, acceptanceRateUzbek: 48, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Music", "Art", "Business", "Engineering", "Korean Language", "Medicine"], notesRu: "Красивый кампус. Сильные музыкальные программы." },
      { nameKo: "동아대학교", nameEn: "Dong-A University", nameRu: "Университет Тона", city: "Busan", tier: "private_mid" as const, website: "https://www.donga.ac.kr", tuitionPerSemesterUsd: 2700, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 55, acceptanceRateUzbek: 50, topikMin: 3, springDeadline: "2026-10-15", fallDeadline: "2026-06-15", programs: ["Engineering", "Business", "Law", "Korean Language", "Art", "IT"], notesRu: "Пусан, у моря. Второй крупный вуз Пусана." },
      { nameKo: "인제대학교", nameEn: "Inje University", nameRu: "Университет Индже", city: "Gimhae", tier: "private_mid" as const, website: "https://www.inje.ac.kr", tuitionPerSemesterUsd: 2600, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 40, acceptanceRateUzbek: 55, topikMin: 3, springDeadline: "2026-10-30", fallDeadline: "2026-06-30", programs: ["Medicine", "Engineering", "Business", "Korean Language", "Design", "Nursing"], notesRu: "Рядом с Пусаном. Сильная медицинская программа." },
      { nameKo: "우송대학교", nameEn: "Woosong University", nameRu: "Университет Усон", city: "Daejeon", tier: "private_mid" as const, website: "https://www.wsu.ac.kr", tuitionPerSemesterUsd: 2500, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 100, acceptanceRateUzbek: 65, topikMin: 2, springDeadline: "2026-11-01", fallDeadline: "2026-07-01", programs: ["Culinary Arts", "Hotel Management", "Business", "IT", "Korean Language", "Design"], notesRu: "Кулинарное искусство и гостиничный бизнес. Много иностранцев." },
      { nameKo: "선문대학교", nameEn: "Sunmoon University", nameRu: "Университет Сонмун", city: "Asan", tier: "private_mid" as const, website: "https://www.sunmoon.ac.kr", tuitionPerSemesterUsd: 2400, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 150, acceptanceRateUzbek: 70, topikMin: 2, springDeadline: "2026-11-10", fallDeadline: "2026-07-10", programs: ["Korean Language", "Business", "IT", "Engineering", "International Studies", "Korean Studies"], notesRu: "Очень много узбекских студентов. Хорошая языковая программа." },
      { nameKo: "가천대학교", nameEn: "Gachon University", nameRu: "Университет Качон", city: "Seongnam", tier: "private_mid" as const, website: "https://www.gachon.ac.kr", tuitionPerSemesterUsd: 3000, dormitoryAvailable: true, dormitoryCostUsd: 420, uzbekStudentsCount: 60, acceptanceRateUzbek: 45, topikMin: 3, springDeadline: "2026-10-15", fallDeadline: "2026-06-15", programs: ["Medicine", "IT", "Business", "Design", "Korean Language", "AI"], notesRu: "Рядом с Сеулом. Хорошая медицинская программа и AI." },
      { nameKo: "한림대학교", nameEn: "Hallym University", nameRu: "Университет Халлим", city: "Chuncheon", tier: "private_mid" as const, website: "https://www.hallym.ac.kr", tuitionPerSemesterUsd: 2600, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 35, acceptanceRateUzbek: 50, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Medicine", "Business", "IT", "Korean Language", "Humanities", "Social Science"], notesRu: "Горный город Чхунчхон. Свежий воздух и природа." },
      { nameKo: "호서대학교", nameEn: "Hoseo University", nameRu: "Университет Хосо", city: "Asan", tier: "private_mid" as const, website: "https://www.hoseo.ac.kr", tuitionPerSemesterUsd: 2500, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 70, acceptanceRateUzbek: 58, topikMin: 2, springDeadline: "2026-10-30", fallDeadline: "2026-06-30", programs: ["IT", "Engineering", "Business", "Korean Language", "Venture", "Design"], notesRu: "Сильная программа предпринимательства и стартапов." },
      { nameKo: "대구대학교", nameEn: "Daegu University", nameRu: "Университет Тэгу", city: "Gyeongsan", tier: "private_mid" as const, website: "https://www.daegu.ac.kr", tuitionPerSemesterUsd: 2500, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 55, acceptanceRateUzbek: 55, topikMin: 3, springDeadline: "2026-10-25", fallDeadline: "2026-06-25", programs: ["Special Education", "Engineering", "Business", "IT", "Korean Language", "Social Welfare"], notesRu: "Лучшая программа специального образования в Корее." },
      { nameKo: "한남대학교", nameEn: "Hannam University", nameRu: "Университет Ханнам", city: "Daejeon", tier: "private_mid" as const, website: "https://www.hnu.kr", tuitionPerSemesterUsd: 2500, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 50, acceptanceRateUzbek: 55, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Business", "IT", "Korean Language", "Engineering", "Art", "Education"], notesRu: "Тэджон. Христианский вуз с хорошими стипендиями." },
      { nameKo: "조선대학교", nameEn: "Chosun University", nameRu: "Университет Чосон", city: "Gwangju", tier: "private_mid" as const, website: "https://www.chosun.ac.kr", tuitionPerSemesterUsd: 2500, dormitoryAvailable: true, dormitoryCostUsd: 280, uzbekStudentsCount: 45, acceptanceRateUzbek: 52, topikMin: 3, springDeadline: "2026-10-20", fallDeadline: "2026-06-20", programs: ["Dentistry", "Engineering", "Business", "Korean Language", "IT", "Medicine"], notesRu: "Гванджу. Хорошая стоматологическая программа." },
      { nameKo: "가톨릭대학교", nameEn: "Catholic University of Korea", nameRu: "Католический университет Кореи", city: "Seoul", tier: "private_top" as const, website: "https://www.catholic.ac.kr", tuitionPerSemesterUsd: 3500, dormitoryAvailable: true, dormitoryCostUsd: 500, uzbekStudentsCount: 35, acceptanceRateUzbek: 25, topikMin: 4, springDeadline: "2026-10-01", fallDeadline: "2026-06-01", programs: ["Medicine", "Nursing", "Theology", "Business", "IT", "Korean Language"], notesRu: "Лучшая медицинская программа среди частных вузов." },
      { nameKo: "순천향대학교", nameEn: "Soonchunhyang University", nameRu: "Университет Сунчхонхян", city: "Asan", tier: "private_mid" as const, website: "https://www.sch.ac.kr", tuitionPerSemesterUsd: 2600, dormitoryAvailable: true, dormitoryCostUsd: 300, uzbekStudentsCount: 60, acceptanceRateUzbek: 55, topikMin: 3, springDeadline: "2026-10-25", fallDeadline: "2026-06-25", programs: ["Medicine", "Nursing", "Engineering", "Business", "IT", "Korean Language"], notesRu: "Асан. Хорошая медицинская программа и больница." },
      { nameKo: "한국교통대학교", nameEn: "Korea National University of Transportation", nameRu: "Корейский транспортный университет", city: "Chungju", tier: "national" as const, website: "https://www.ut.ac.kr", tuitionPerSemesterUsd: 2000, dormitoryAvailable: true, dormitoryCostUsd: 250, uzbekStudentsCount: 45, acceptanceRateUzbek: 55, topikMin: 2, springDeadline: "2026-10-30", fallDeadline: "2026-06-30", programs: ["Transportation", "Engineering", "IT", "Business", "Korean Language", "Design"], notesRu: "Специализация на транспорте и логистике. Недорогой." },
    ];

    const universityIds = [];
    for (const u of universities) {
      const id = await ctx.db.insert("universities", {
        nameKo: u.nameKo,
        nameEn: u.nameEn,
        nameRu: u.nameRu,
        city: u.city,
        tier: u.tier,
        website: u.website,
        tuitionPerSemesterUsd: u.tuitionPerSemesterUsd,
        dormitoryAvailable: u.dormitoryAvailable,
        dormitoryCostUsd: u.dormitoryCostUsd,
        uzbekStudentsCount: u.uzbekStudentsCount,
        acceptanceRateUzbek: u.acceptanceRateUzbek,
        availablePrograms: u.programs,
        languageRequirements: { topik_min: u.topikMin },
        springDeadline: u.springDeadline,
        fallDeadline: u.fallDeadline,
        notesRu: u.notesRu,
      });
      universityIds.push(id);
    }

    // ==========================================
    // 5. Create 20 test students (5 per branch)
    // ==========================================
    const studentData = [
      // Branch 0: Tashkent
      { firstNameRu: "Азизбек", lastNameRu: "Каримов", firstNameEn: "Azizbek", lastNameEn: "Karimov", gender: "male" as const, dob: "2003-05-12", phone: "+998901234567", email: "azizbek.k@gmail.com", telegram: "@azizbek_k", parentName: "Каримов Бахтиёр", parentPhone: "+998901234500", region: "Ташкент", passportNumber: "AA1234567", passportIssue: "2022-01-15", passportExpiry: "2032-01-15", topik: "level_3" as const, status: "submitted_to_uni" as const, priority: "high" as const, education: "class_11" as const, gpa: 4.2, paidAmount: 1500, paymentStatus: "partial" as const, branchIdx: 0, uniIdx: 6 },
      { firstNameRu: "Мадина", lastNameRu: "Рахимова", firstNameEn: "Madina", lastNameEn: "Rakhimova", gender: "female" as const, dob: "2004-08-23", phone: "+998901234568", email: "madina.r@gmail.com", telegram: "@madina_r", parentName: "Рахимов Олим", parentPhone: "+998901234501", region: "Ташкент", passportNumber: "AA2345678", passportIssue: "2023-03-10", passportExpiry: "2033-03-10", topik: "level_4" as const, status: "accepted" as const, priority: "normal" as const, education: "class_11" as const, gpa: 4.5, paidAmount: 3000, paymentStatus: "full" as const, branchIdx: 0, uniIdx: 0 },
      { firstNameRu: "Шахзод", lastNameRu: "Юсупов", firstNameEn: "Shahzod", lastNameEn: "Yusupov", gender: "male" as const, dob: "2003-11-05", phone: "+998901234569", email: "shahzod.y@gmail.com", telegram: "@shahzod_y", parentName: "Юсупов Ильхом", parentPhone: "+998901234502", region: "Ташкент", passportNumber: "AA3456789", passportIssue: "2022-06-20", passportExpiry: "2032-06-20", topik: "level_2" as const, status: "docs_collecting" as const, priority: "normal" as const, education: "college" as const, gpa: 3.8, paidAmount: 500, paymentStatus: "partial" as const, branchIdx: 0, uniIdx: 9 },
      { firstNameRu: "Гулнора", lastNameRu: "Ахмедова", firstNameEn: "Gulnora", lastNameEn: "Akhmedova", gender: "female" as const, dob: "2004-02-14", phone: "+998901234570", email: "gulnora.a@gmail.com", telegram: "@gulnora_a", parentName: "Ахмедов Рустам", parentPhone: "+998901234503", region: "Ташкент", passportNumber: "AA4567890", passportIssue: "2023-01-05", passportExpiry: "2033-01-05", topik: "none" as const, status: "new" as const, priority: "normal" as const, education: "class_11" as const, gpa: 4.0, paidAmount: 0, paymentStatus: "not_paid" as const, branchIdx: 0, uniIdx: 16 },
      { firstNameRu: "Бобур", lastNameRu: "Тошматов", firstNameEn: "Bobur", lastNameEn: "Toshmatov", gender: "male" as const, dob: "2002-07-30", phone: "+998901234571", email: "bobur.t@gmail.com", telegram: "@bobur_t", parentName: "Тошматов Фарход", parentPhone: "+998901234504", region: "Ташкент", passportNumber: "AA5678901", passportIssue: "2021-09-12", passportExpiry: "2031-09-12", topik: "level_5" as const, status: "departed" as const, priority: "normal" as const, education: "bachelor" as const, gpa: 4.7, paidAmount: 3000, paymentStatus: "full" as const, branchIdx: 0, uniIdx: 1 },

      // Branch 1: Samarkand
      { firstNameRu: "Дильноза", lastNameRu: "Хасанова", firstNameEn: "Dilnoza", lastNameEn: "Khasanova", gender: "female" as const, dob: "2004-04-18", phone: "+998901234572", email: "dilnoza.kh@gmail.com", telegram: "@dilnoza_kh", parentName: "Хасанов Бекзод", parentPhone: "+998901234505", region: "Самарканд", passportNumber: "AB1234567", passportIssue: "2023-02-28", passportExpiry: "2033-02-28", topik: "level_3" as const, status: "visa_processing" as const, priority: "high" as const, education: "class_11" as const, gpa: 4.3, paidAmount: 2500, paymentStatus: "partial" as const, branchIdx: 1, uniIdx: 5 },
      { firstNameRu: "Жавохир", lastNameRu: "Мирзаев", firstNameEn: "Javokhir", lastNameEn: "Mirzaev", gender: "male" as const, dob: "2003-09-07", phone: "+998901234573", email: "javokhir.m@gmail.com", telegram: "@javokhir_m", parentName: "Мирзаев Шухрат", parentPhone: "+998901234506", region: "Самарканд", passportNumber: "AB2345678", passportIssue: "2022-11-15", passportExpiry: "2032-11-15", topik: "level_4" as const, status: "visa_ready" as const, priority: "urgent" as const, education: "class_11" as const, gpa: 4.6, paidAmount: 3000, paymentStatus: "full" as const, branchIdx: 1, uniIdx: 2 },
      { firstNameRu: "Нигора", lastNameRu: "Усманова", firstNameEn: "Nigora", lastNameEn: "Usmanova", gender: "female" as const, dob: "2004-12-25", phone: "+998901234574", email: "nigora.u@gmail.com", telegram: "@nigora_u", parentName: "Усманов Алишер", parentPhone: "+998901234507", region: "Самарканд", passportNumber: "AB3456789", passportIssue: "2023-05-10", passportExpiry: "2033-05-10", topik: "level_1" as const, status: "docs_ready" as const, priority: "normal" as const, education: "class_11" as const, gpa: 3.9, paidAmount: 1000, paymentStatus: "partial" as const, branchIdx: 1, uniIdx: 23 },
      { firstNameRu: "Сардор", lastNameRu: "Назаров", firstNameEn: "Sardor", lastNameEn: "Nazarov", gender: "male" as const, dob: "2003-03-16", phone: "+998901234575", email: "sardor.n@gmail.com", telegram: "@sardor_n", parentName: "Назаров Умид", parentPhone: "+998901234508", region: "Самарканд", passportNumber: "AB4567890", passportIssue: "2022-08-20", passportExpiry: "2032-08-20", topik: "level_2" as const, status: "submitted_to_uni" as const, priority: "normal" as const, education: "college" as const, gpa: 3.7, paidAmount: 1500, paymentStatus: "partial" as const, branchIdx: 1, uniIdx: 12 },
      { firstNameRu: "Зарина", lastNameRu: "Абдуллаева", firstNameEn: "Zarina", lastNameEn: "Abdullaeva", gender: "female" as const, dob: "2004-06-09", phone: "+998901234576", email: "zarina.a@gmail.com", telegram: "@zarina_a", parentName: "Абдуллаев Жамшид", parentPhone: "+998901234509", region: "Самарканд", passportNumber: "AB5678901", passportIssue: "2023-04-15", passportExpiry: "2033-04-15", topik: "none" as const, status: "on_hold" as const, priority: "normal" as const, education: "class_11" as const, gpa: 3.5, paidAmount: 0, paymentStatus: "not_paid" as const, branchIdx: 1, uniIdx: 40 },

      // Branch 2: Fergana
      { firstNameRu: "Улугбек", lastNameRu: "Тоджибаев", firstNameEn: "Ulugbek", lastNameEn: "Tojibaev", gender: "male" as const, dob: "2003-01-22", phone: "+998901234577", email: "ulugbek.t@gmail.com", telegram: "@ulugbek_t", parentName: "Тоджибаев Хуршид", parentPhone: "+998901234510", region: "Фергана", passportNumber: "AC1234567", passportIssue: "2022-03-10", passportExpiry: "2032-03-10", topik: "level_3" as const, status: "docs_collecting" as const, priority: "high" as const, education: "class_11" as const, gpa: 4.1, paidAmount: 800, paymentStatus: "partial" as const, branchIdx: 2, uniIdx: 7 },
      { firstNameRu: "Фарзона", lastNameRu: "Мамадалиева", firstNameEn: "Farzona", lastNameEn: "Mamadalieva", gender: "female" as const, dob: "2004-10-03", phone: "+998901234578", email: "farzona.m@gmail.com", telegram: "@farzona_m", parentName: "Мамадалиев Нодир", parentPhone: "+998901234511", region: "Фергана", passportNumber: "AC2345678", passportIssue: "2023-07-22", passportExpiry: "2033-07-22", topik: "level_4" as const, status: "accepted" as const, priority: "normal" as const, education: "class_11" as const, gpa: 4.4, paidAmount: 3000, paymentStatus: "full" as const, branchIdx: 2, uniIdx: 10 },
      { firstNameRu: "Достон", lastNameRu: "Эргашев", firstNameEn: "Doston", lastNameEn: "Ergashev", gender: "male" as const, dob: "2003-06-28", phone: "+998901234579", email: "doston.e@gmail.com", telegram: "@doston_e", parentName: "Эргашев Толиб", parentPhone: "+998901234512", region: "Фергана", passportNumber: "AC3456789", passportIssue: "2022-12-05", passportExpiry: "2032-12-05", topik: "level_2" as const, status: "new" as const, priority: "normal" as const, education: "class_11" as const, gpa: 3.6, paidAmount: 0, paymentStatus: "not_paid" as const, branchIdx: 2, uniIdx: 36 },
      { firstNameRu: "Севара", lastNameRu: "Ортикова", firstNameEn: "Sevara", lastNameEn: "Ortikova", gender: "female" as const, dob: "2004-03-11", phone: "+998901234580", email: "sevara.o@gmail.com", telegram: "@sevara_o", parentName: "Ортиков Баходир", parentPhone: "+998901234513", region: "Фергана", passportNumber: "AC4567890", passportIssue: "2023-09-18", passportExpiry: "2033-09-18", topik: "level_3" as const, status: "docs_ready" as const, priority: "urgent" as const, education: "college" as const, gpa: 4.0, paidAmount: 2000, paymentStatus: "partial" as const, branchIdx: 2, uniIdx: 8 },
      { firstNameRu: "Ислом", lastNameRu: "Холматов", firstNameEn: "Islom", lastNameEn: "Kholmatov", gender: "male" as const, dob: "2002-08-19", phone: "+998901234581", email: "islom.kh@gmail.com", telegram: "@islom_kh", parentName: "Холматов Равшан", parentPhone: "+998901234514", region: "Фергана", passportNumber: "AC5678901", passportIssue: "2021-05-30", passportExpiry: "2031-05-30", topik: "level_5" as const, status: "departed" as const, priority: "normal" as const, education: "bachelor" as const, gpa: 4.8, paidAmount: 3000, paymentStatus: "full" as const, branchIdx: 2, uniIdx: 3 },

      // Branch 3: Bukhara
      { firstNameRu: "Камола", lastNameRu: "Турсунова", firstNameEn: "Kamola", lastNameEn: "Tursunova", gender: "female" as const, dob: "2004-01-07", phone: "+998901234582", email: "kamola.t@gmail.com", telegram: "@kamola_t", parentName: "Турсунов Музаффар", parentPhone: "+998901234515", region: "Бухара", passportNumber: "AD1234567", passportIssue: "2023-06-14", passportExpiry: "2033-06-14", topik: "level_3" as const, status: "submitted_to_uni" as const, priority: "normal" as const, education: "class_11" as const, gpa: 4.2, paidAmount: 1500, paymentStatus: "partial" as const, branchIdx: 3, uniIdx: 11 },
      { firstNameRu: "Отабек", lastNameRu: "Жуманиязов", firstNameEn: "Otabek", lastNameEn: "Jumaniyazov", gender: "male" as const, dob: "2003-04-25", phone: "+998901234583", email: "otabek.j@gmail.com", telegram: "@otabek_j", parentName: "Жуманиязов Абдулла", parentPhone: "+998901234516", region: "Бухара", passportNumber: "AD2345678", passportIssue: "2022-10-08", passportExpiry: "2032-10-08", topik: "level_4" as const, status: "visa_processing" as const, priority: "high" as const, education: "class_11" as const, gpa: 4.5, paidAmount: 2800, paymentStatus: "partial" as const, branchIdx: 3, uniIdx: 13 },
      { firstNameRu: "Лола", lastNameRu: "Бабаева", firstNameEn: "Lola", lastNameEn: "Babaeva", gender: "female" as const, dob: "2004-09-15", phone: "+998901234584", email: "lola.b@gmail.com", telegram: "@lola_b", parentName: "Бабаев Комил", parentPhone: "+998901234517", region: "Бухара", passportNumber: "AD3456789", passportIssue: "2023-08-25", passportExpiry: "2033-08-25", topik: "level_1" as const, status: "new" as const, priority: "normal" as const, education: "class_11" as const, gpa: 3.8, paidAmount: 0, paymentStatus: "not_paid" as const, branchIdx: 3, uniIdx: 41 },
      { firstNameRu: "Абдулазиз", lastNameRu: "Сафаров", firstNameEn: "Abdulaziz", lastNameEn: "Safarov", gender: "male" as const, dob: "2003-12-02", phone: "+998901234585", email: "abdulaziz.s@gmail.com", telegram: "@abdulaziz_s", parentName: "Сафаров Икром", parentPhone: "+998901234518", region: "Бухара", passportNumber: "AD4567890", passportIssue: "2022-04-17", passportExpiry: "2032-04-17", topik: "level_3" as const, status: "rejected" as const, priority: "normal" as const, education: "college" as const, gpa: 3.4, paidAmount: 1000, paymentStatus: "partial" as const, branchIdx: 3, uniIdx: 14 },
      { firstNameRu: "Мохира", lastNameRu: "Ибрагимова", firstNameEn: "Mokhira", lastNameEn: "Ibragimova", gender: "female" as const, dob: "2002-11-20", phone: "+998901234586", email: "mokhira.i@gmail.com", telegram: "@mokhira_i", parentName: "Ибрагимов Шерзод", parentPhone: "+998901234519", region: "Бухара", passportNumber: "AD5678901", passportIssue: "2021-07-09", passportExpiry: "2031-07-09", topik: "level_6" as const, status: "departed" as const, priority: "normal" as const, education: "bachelor" as const, gpa: 4.9, paidAmount: 3000, paymentStatus: "full" as const, branchIdx: 3, uniIdx: 0 },
    ];

    const studentIds = [];
    for (const s of studentData) {
      const id = await ctx.db.insert("students", {
        branchId: branchIds[s.branchIdx],
        agentId: agentIds[s.branchIdx],
        firstNameRu: s.firstNameRu,
        lastNameRu: s.lastNameRu,
        firstNameEn: s.firstNameEn,
        lastNameEn: s.lastNameEn,
        dateOfBirth: s.dob,
        gender: s.gender,
        passportNumber: s.passportNumber,
        passportIssueDate: s.passportIssue,
        passportExpiryDate: s.passportExpiry,
        phone: s.phone,
        email: s.email,
        telegramUsername: s.telegram,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        region: s.region,
        currentEducationLevel: s.education,
        gpaScore: s.gpa,
        topikLevel: s.topik,
        contractAmount: 3000,
        paidAmount: s.paidAmount,
        paymentStatus: s.paymentStatus,
        status: s.status,
        priority: s.priority,
        assignedUniversityId: universityIds[s.uniIdx],
        admissionYear: 2026,
        admissionSemester: "fall",
      });
      studentIds.push(id);
    }

    // ==========================================
    // 6. Create documents for each student
    // ==========================================
    const documentTypes: Array<"passport" | "internal_passport" | "birth_certificate" | "school_diploma" | "school_transcript" | "diploma_apostille" | "transcript_apostille" | "topik_certificate" | "medical_certificate" | "hiv_certificate" | "no_criminal_record" | "bank_statement" | "sponsor_documents" | "photos" | "motivation_letter" | "recommendation_letter" | "portfolio" | "health_insurance" | "acceptance_letter" | "visa_d2" | "ars_registration" | "contract_signed" | "payment_receipt"> = [
      "passport", "internal_passport", "birth_certificate", "school_diploma",
      "school_transcript", "diploma_apostille", "transcript_apostille",
      "topik_certificate", "medical_certificate", "hiv_certificate",
      "no_criminal_record", "bank_statement", "sponsor_documents", "photos",
      "motivation_letter", "recommendation_letter", "portfolio",
      "health_insurance", "acceptance_letter", "visa_d2", "ars_registration",
      "contract_signed", "payment_receipt",
    ];

    // Advanced statuses: departed, accepted, visa_ready, visa_processing
    const advancedStatuses = ["departed", "accepted", "visa_ready", "visa_processing"];
    const midStatuses = ["submitted_to_uni", "docs_ready"];

    for (let i = 0; i < studentIds.length; i++) {
      const studentStatus = studentData[i].status;
      const isAdvanced = advancedStatuses.includes(studentStatus);
      const isMid = midStatuses.includes(studentStatus);

      for (let j = 0; j < documentTypes.length; j++) {
        const docType = documentTypes[j];
        let status: "missing" | "uploaded" | "verified" | "rejected" | "expired";

        if (isAdvanced) {
          // Most docs verified for advanced students
          if (j < 18) {
            status = "verified";
          } else if (docType === "acceptance_letter") {
            status = studentStatus === "departed" || studentStatus === "accepted" ? "verified" : "missing";
          } else if (docType === "visa_d2") {
            status = studentStatus === "departed" || studentStatus === "visa_ready" ? "verified" : "uploaded";
          } else {
            status = studentStatus === "departed" ? "verified" : "missing";
          }
        } else if (isMid) {
          // Basic docs uploaded/verified for mid-level students
          if (j < 8) {
            status = "verified";
          } else if (j < 14) {
            status = "uploaded";
          } else {
            status = "missing";
          }
        } else {
          // New or early-stage students
          if (j < 3) {
            status = "uploaded";
          } else {
            status = "missing";
          }
        }

        const expiryDate = docType === "passport" ? studentData[i].passportExpiry
          : docType === "medical_certificate" ? "2026-09-01"
          : docType === "hiv_certificate" ? "2026-08-01"
          : docType === "topik_certificate" && studentData[i].topik !== "none" ? "2028-01-01"
          : undefined;

        await ctx.db.insert("documents", {
          studentId: studentIds[i],
          type: docType,
          status,
          uploadedAt: status !== "missing" ? now - Math.random() * 30 * DAY_MS : undefined,
          verifiedAt: status === "verified" ? now - Math.random() * 15 * DAY_MS : undefined,
          expiryDate,
        });
      }
    }

    // ==========================================
    // 7. Create 10 sample tasks
    // ==========================================
    const taskData = [
      { title: "Собрать документы Азизбека", desc: "Собрать все необходимые документы для подачи в Ханъян", agentIdx: 0, studentIdx: 0, dueDate: now + 5 * DAY_MS, status: "in_progress" as const, priority: "high" as const, type: "document" as const },
      { title: "Оплата за Мадину", desc: "Проверить статус оплаты и подтвердить", agentIdx: 0, studentIdx: 1, dueDate: now + 3 * DAY_MS, status: "pending" as const, priority: "medium" as const, type: "payment" as const },
      { title: "Подать документы Шахзода", desc: "Подать документы в Кёнхи", agentIdx: 0, studentIdx: 2, dueDate: now - 2 * DAY_MS, status: "overdue" as const, priority: "high" as const, type: "submission" as const },
      { title: "Визовое интервью Дильнозы", desc: "Подготовить к визовому интервью", agentIdx: 1, studentIdx: 5, dueDate: now + 7 * DAY_MS, status: "pending" as const, priority: "critical" as const, type: "interview" as const },
      { title: "Отправить доп. документы Жавохира", desc: "Университет запросил дополнительные документы", agentIdx: 1, studentIdx: 6, dueDate: now + 2 * DAY_MS, status: "in_progress" as const, priority: "high" as const, type: "document" as const },
      { title: "Связаться с родителями Нигоры", desc: "Обсудить финансовые вопросы", agentIdx: 1, studentIdx: 7, dueDate: now + 10 * DAY_MS, status: "pending" as const, priority: "low" as const, type: "follow_up" as const },
      { title: "Подготовить портфолио Улугбека", desc: "Помочь составить портфолио для подачи", agentIdx: 2, studentIdx: 10, dueDate: now + 4 * DAY_MS, status: "pending" as const, priority: "medium" as const, type: "document" as const },
      { title: "Проверить банковскую выписку Севары", desc: "Проверить актуальность банковской справки", agentIdx: 2, studentIdx: 13, dueDate: now - 5 * DAY_MS, status: "overdue" as const, priority: "high" as const, type: "document" as const },
      { title: "Забронировать общежитие для Камолы", desc: "Подать заявку на общежитие в Ихва", agentIdx: 3, studentIdx: 15, dueDate: now + 14 * DAY_MS, status: "pending" as const, priority: "medium" as const, type: "other" as const },
      { title: "Виза для Отабека", desc: "Подать документы на визу D-2", agentIdx: 3, studentIdx: 16, dueDate: now + 1 * DAY_MS, status: "in_progress" as const, priority: "critical" as const, type: "submission" as const },
    ];

    const taskIds = [];
    for (const t of taskData) {
      const id = await ctx.db.insert("tasks", {
        studentId: studentIds[t.studentIdx],
        agentId: agentIds[t.agentIdx],
        createdById: bossId,
        title: t.title,
        description: t.desc,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority,
        type: t.type,
      });
      taskIds.push(id);
    }

    // ==========================================
    // 8. Create 5 comments
    // ==========================================
    await ctx.db.insert("comments", {
      studentId: studentIds[0],
      authorId: agentIds[0],
      text: "Азизбек принёс все оригиналы. Копии заверены нотариусом.",
      isInternal: false,
    });

    await ctx.db.insert("comments", {
      studentId: studentIds[1],
      authorId: bossId,
      text: "Мадина — отличная кандидатура для SNU. Высокий TOPIK и GPA.",
      isInternal: true,
    });

    await ctx.db.insert("comments", {
      studentId: studentIds[5],
      authorId: agentIds[1],
      text: "Дильноза подготовлена к интервью. Документы все в порядке.",
      isInternal: false,
    });

    await ctx.db.insert("comments", {
      studentId: studentIds[10],
      authorId: agentIds[2],
      text: "Улугбек работает над мотивационным письмом. Нужна помощь с корейским.",
      isInternal: false,
    });

    await ctx.db.insert("comments", {
      studentId: studentIds[19],
      authorId: bossId,
      text: "Мохира — лучшая студентка сезона. TOPIK 6, GPA 4.9. Поступила в SNU!",
      isInternal: true,
    });

    // ==========================================
    // 9. Create season goal
    // ==========================================
    await ctx.db.insert("seasonGoals", {
      semester: "fall",
      year: 2025,
      targetCount: 120,
      currentCount: 47,
    });

    // ==========================================
    // 10. Create 4 achievements
    // ==========================================
    await ctx.db.insert("achievements", {
      userId: agentIds[0],
      type: "top_agent",
      title: "Лучший агент месяца",
      description: "Больше всего студентов отправлено в марте 2025",
      icon: "trophy",
    });

    await ctx.db.insert("achievements", {
      userId: agentIds[1],
      type: "fast_processor",
      title: "Скоростной обработчик",
      description: "Самое быстрое оформление документов",
      icon: "zap",
    });

    await ctx.db.insert("achievements", {
      studentId: studentIds[19],
      type: "sky_admission",
      title: "Поступление в SKY",
      description: "Мохира поступила в Seoul National University",
      icon: "star",
    });

    await ctx.db.insert("achievements", {
      studentId: studentIds[4],
      type: "topik_master",
      title: "Мастер TOPIK",
      description: "Бобур сдал TOPIK 5 с первой попытки",
      icon: "award",
    });

    return {
      success: true,
      message: "Seed data created successfully!",
      counts: {
        users: 5,
        branches: 4,
        universities: 50,
        students: 20,
        documents: 20 * 23,
        tasks: 10,
        comments: 5,
        seasonGoals: 1,
        achievements: 4,
      },
    };
  },
});
