# KoryoPath CRM

**Система управления студентами для агентства по отправке из Узбекистана в университеты Южной Кореи**

---

## О системе

KoryoPath CRM — полнофункциональная CRM-система для агентств, помогающих узбекским студентам поступить в южнокорейские университеты. Система охватывает весь процесс: от первичного обращения до отъезда в Корею.

### Ключевые возможности

- **Управление студентами** — профиль, документы, статусы, Kanban-доска с drag & drop
- **База 50 университетов Кореи** — дедлайны, требования, стоимость, умный подбор
- **Система задач** — автоматические задачи при смене статуса, дедлайны, эскалация
- **Штрафная система** — автоматические предупреждения, штрафы и бонусы для агентов
- **Аналитика** — дневная, недельная и месячная для руководителя
- **Gamification** — командная миссия, лидерборд, достижения, Wall of Fame
- **Мультиязычность** — русский, корейский, английский (react-i18next)
- **Real-time** — мгновенные обновления через Convex reactive queries
- **Файловое хранилище** — встроенное через Convex Storage

### Роли

| Роль | Описание |
|------|----------|
| **Boss** | Главный администратор (Сеул). Полный доступ, назначение университетов, аналитика |
| **Branch Agent** | Агент филиала (Ташкент, Самарканд, Фергана, Бухара). Доступ только к своему филиалу |

---

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Framer Motion |
| Backend | **Convex** (serverless functions, real-time database, file storage, cron jobs) |
| Auth | Session-based (bcryptjs + Convex) |
| State | Zustand (UI state) + Convex reactive queries (server state) |
| i18n | react-i18next (ru, ko, en) |
| Charts | Recharts |
| DnD | @dnd-kit |

### Почему Convex?

Convex заменяет собой целый стек:
- **PostgreSQL + Prisma** → Convex Database (реактивная, с автоматической типизацией)
- **Express API** → Convex Functions (queries, mutations, actions)
- **Socket.io** → Convex real-time subscriptions (из коробки)
- **Cloudinary** → Convex File Storage
- **node-cron** → Convex Cron Jobs
- **Docker** → Не нужен, Convex полностью облачный

---

## Быстрый старт

### Требования

- Node.js 20+
- Аккаунт Convex (бесплатный): https://convex.dev

### Установка

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd koryopath-crm

# 2. Установить зависимости
npm install
cd frontend && npm install && cd ..

# 3. Настроить Convex
npx convex dev
# → Откроется браузер для авторизации
# → Convex создаст проект и сгенерирует URL

# 4. Добавить VITE_CONVEX_URL в frontend/.env
echo "VITE_CONVEX_URL=https://your-project.convex.cloud" > frontend/.env

# 5. Заполнить базу тестовыми данными
# В Convex Dashboard → Functions → seed → Run
# Или через CLI:
npx convex run seed

# 6. Запустить фронтенд
cd frontend && npm run dev
```

Система доступна: **http://localhost:3000**

### Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| boss@koryopath.com | Koryopath2024! | Boss |
| tashkent@koryopath.com | Agent2024! | Agent (Ташкент) |
| samarkand@koryopath.com | Agent2024! | Agent (Самарканд) |
| fergana@koryopath.com | Agent2024! | Agent (Фергана) |
| bukhara@koryopath.com | Agent2024! | Agent (Бухара) |

---

## Структура проекта

```
koryopath-crm/
├── package.json              # Root package.json
├── .env.example
├── README.md
├── convex/                   # Convex Backend
│   ├── schema.ts             # Database schema (таблицы, индексы, валидаторы)
│   ├── auth.ts               # Аутентификация (login, logout, getMe, profile)
│   ├── students.ts           # CRUD студентов, статистика, назначение университета
│   ├── documents.ts          # Документы, файловое хранилище, верификация
│   ├── universities.ts       # Каталог университетов, умный подбор, сравнение
│   ├── tasks.ts              # Задачи и дедлайны
│   ├── penalties.ts          # Штрафы и бонусы
│   ├── notifications.ts      # Уведомления (real-time)
│   ├── analytics.ts          # Аналитика (daily/weekly/monthly)
│   ├── comments.ts           # Комментарии к студентам
│   ├── gamification.ts       # Лидерборд, достижения, Wall of Fame
│   ├── exchange.ts           # Курсы валют (USD/KRW/UZS)
│   ├── users.ts              # Управление пользователями
│   ├── branches.ts           # Управление филиалами
│   ├── crons.ts              # Cron jobs (overdue tasks, expiring docs, penalties)
│   ├── cronFunctions.ts      # Функции для cron jobs
│   ├── seed.ts               # Тестовые данные (50 университетов, 20 студентов)
│   └── helpers.ts            # Auth helpers, транслитерация
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx           # ConvexProvider обёртка
        ├── App.tsx            # Роутинг, lazy loading
        ├── index.css          # Tailwind + кастомные стили
        ├── lib/convex.ts      # Convex React Client
        ├── types/index.ts     # TypeScript типы
        ├── store/             # Zustand (auth, ui, filters)
        ├── hooks/             # useKeyboardShortcuts, useDebounce, useCountUp
        ├── i18n/              # ru.json, ko.json, en.json (264 ключа)
        ├── components/
        │   ├── layout/        # Layout, Sidebar, Header, GlobalSearch, Notifications
        │   ├── ui/            # StatusBadge, Modal, DataTable, ProgressBar, etc.
        │   └── students/      # KanbanBoard
        └── pages/             # 12 страниц приложения
```

---

## Convex Functions API

### Auth
| Функция | Тип | Описание |
|---------|-----|----------|
| auth.login | mutation | Вход (email + password) |
| auth.getMe | query | Текущий пользователь |
| auth.logout | mutation | Выход |
| auth.updateProfile | mutation | Обновление профиля |
| auth.changePassword | mutation | Смена пароля |

### Students
| Функция | Тип | Описание |
|---------|-----|----------|
| students.list | query | Список с фильтрами и пагинацией |
| students.getById | query | Детальная карточка с документами, задачами, комментариями |
| students.create | mutation | Создание + авто-транслитерация + создание документов |
| students.update | mutation | Обновление + авто-задачи при смене статуса |
| students.remove | mutation | Удаление (Boss) |
| students.getStats | query | Статистика по статусам/приоритетам |
| students.assignUniversity | mutation | Назначение университета (Boss) |
| students.exportList | query | Экспорт без пагинации |

### Documents
| Функция | Тип | Описание |
|---------|-----|----------|
| documents.getByStudent | query | Все документы студента |
| documents.update | mutation | Обновление статуса/файла |
| documents.verify | mutation | Верификация/отклонение (Boss) |
| documents.getExpiring | query | Истекающие документы |
| documents.generateUploadUrl | mutation | URL для загрузки файла |
| documents.saveFile | mutation | Сохранение файла после загрузки |

### Universities
| Функция | Тип | Описание |
|---------|-----|----------|
| universities.list | query | Каталог с поиском и фильтрами |
| universities.getById | query | Детали университета |
| universities.matchForStudent | query | Умный подбор по параметрам студента |
| universities.compare | query | Сравнение 2-5 университетов |

### Analytics (Boss only)
| Функция | Тип | Описание |
|---------|-----|----------|
| analytics.daily | query | Дневная статистика |
| analytics.weekly | query | Недельная с KPI агентов |
| analytics.monthly | query | Месячная с графиками |

---

## Внешние интеграции

| Сервис | Назначение | Ключ |
|--------|-----------|------|
| **Convex** | Backend, DB, Storage, Real-time | [convex.dev](https://convex.dev) — бесплатный tier |
| **ExchangeRate API** | Курсы USD/KRW/UZS | Не требует ключа |
| **HIKOREA** | Проверка статуса визы | Прямая ссылка |
| **Study in Korea** | Портал университетов | Прямая ссылка |
| **TOPIK** | Регистрация на экзамен | Прямая ссылка |
| **GKS** | Стипендии | Прямая ссылка |

---

## Безопасность

- Session-based аутентификация (bcryptjs, salt 10)
- Row Level Security — агент видит только свой филиал (проверка в каждой функции)
- Все мутации требуют валидный sessionToken
- Convex автоматически типизирует все запросы (нет SQL injection)
- Activity log — каждое действие логируется

---

## Лицензия

Proprietary. KoryoPath CRM.
