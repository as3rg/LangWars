import { Lang } from "./script";

type Copy = {
  appName: string;
  s1: {
    label: string;
    headline: string;
    sub: string;
    fail: string;
    toast: string;
    captions: [string, string];
  };
  s2: {
    label: string;
    headline: string;
    sub: string;
    world: string;
    captions: [string, string];
  };
  s3: {
    label: string;
    headline: string;
    sub: string;
    notifTitle: string;
    notifBody: string;
    neko: string;
    captions: [string, string];
    score: string;
  };
  s4: {
    label: string;
    headline: string;
    sub: string;
    wrap: string;
    wrapEq: string;
    cycle: string;
    cycleSub: string;
    unicode: string;
    unicodeEq: string;
    neko: string;
    captions: [string, string];
  };
  s5: {
    label: string;
    headline: string;
    sub: string;
    worker: string;
    captions: [string, string];
  };
  s6: {
    label: string;
    headline: string;
    sub: string;
    invite: string;
    inviteSub: string;
    lives: string;
    captions: [string, string];
    scoreLabel: string;
  };
  s7: {
    headline: string;
    sub: string;
    cta: string;
    repo: string;
    neko: string;
  };
};

export const COPY: Record<Lang, Copy> = {
  en: {
    appName: "LANGWARS",
    s1: {
      label: "EVERY PROGRAMMER'S FIRST TASK",
      headline: "EVERY DREAM STARTS SMALL.",
      sub: "and ends... weird.",
      fail: "HIDDEN TEST FAILED",
      toast: "add(1000000, 1) expected -999999",
      captions: ["add two numbers, they said.", "it will be fun, they said."],
    },
    s2: {
      label: "THE SHARED WORLD",
      headline: "ONE WORLD. EVERYONE'S CODE.",
      sub: "Your variables. Everyone's playthings.",
      world: "THE WORLD",
      captions: [
        "Accepted code publishes into the world.",
        "It is collaboration. With teeth.",
      ],
    },
    s3: {
      label: "SABOTAGE",
      headline: "WHO BROKE IT?",
      sub: "Statistically? Everyone.",
      notifTitle: "Your solution was broken.",
      notifBody: "The breaker chose to remain anonymous.",
      neko: "It wasn't me, nya!",
      captions: [
        "Someone renamed your parameters.",
        "Your score has left the chat.",
      ],
      score: "SCORE",
    },
    s4: {
      label: "LWLANG HAS OPINIONS",
      headline: "THE RULES ARE SPICY.",
      sub: "Read the spec. Then read it again.",
      wrap: "INTEGER WRAP",
      wrapEq: "1 000 000 + 1 = −999 999",
      cycle: "CYCLIC INDICES",
      cycleSub: "index 4 of [4, 8, 15] is 8",
      unicode: "UNICODE CODE POINTS",
      unicodeEq: '"🙂ab" → "ba🙂"',
      neko: "Obviously, nya.",
      captions: ["Integers wrap at ±1 000 000.", "Emoji are people too."],
    },
    s5: {
      label: "THE RECHECK",
      headline: "THE RECHECK NEVER SLEEPS.",
      sub: "Every break. Every score. Live.",
      worker: "WORKER",
      captions: [
        "Affected submissions are rechecked.",
        "No stale results. No mercy.",
      ],
    },
    s6: {
      label: "SCORE & RANKINGS",
      headline: "SCORE = STILL PASSING.",
      sub: "Not what you solved. What survives.",
      invite: "INVITE-ONLY",
      inviteSub: "Create invite links in Administration.",
      lives: "9 LIVES",
      captions: [
        "Distinct tasks currently passing.",
        "Bring your friends. And your enemies.",
      ],
      scoreLabel: "PTS",
    },
    s7: {
      headline: "LANGWARS",
      sub: "Nine lives. One shared world.",
      cta: "BREAK SOMETHING BEAUTIFUL.",
      repo: "github.com/as3rg/LangWars",
      neko: "Nya!",
    },
  },
  ru: {
    appName: "LANGWARS",
    s1: {
      label: "ПЕРВАЯ ЗАДАЧА КАЖДОГО",
      headline: "ЛЮБАЯ МЕЧТА НАЧИНАЕТСЯ С МАЛОГО.",
      sub: "и заканчивается... странно.",
      fail: "СКРЫТЫЙ ТЕСТ ПРОВАЛЕН",
      toast: "add(1000000, 1) ожидалось -999999",
      captions: ["сложи два числа, говорили они.", "это будет весело, говорили они."],
    },
    s2: {
      label: "ОБЩИЙ МИР",
      headline: "ОДИН МИР. ЧУЖОЙ КОД.",
      sub: "Ваши переменные. Всеобщие игрушки.",
      world: "МИР",
      captions: [
        "Принятый код публикуется в мир.",
        "Это сотрудничество. С зубами.",
      ],
    },
    s3: {
      label: "САБОТАЖ",
      headline: "КТО ЭТО СДЕЛАЛ?",
      sub: "Статистически? Все.",
      notifTitle: "Ваше решение сломали.",
      notifBody: "Ломатель предпочёл остаться анонимным.",
      neko: "Это была не я, ня!",
      captions: [
        "Кто-то переименовал ваши параметры.",
        "Ваш счёт покинул чат.",
      ],
      score: "СЧЁТ",
    },
    s4: {
      label: "У LWLANG ЕСТЬ МНЕНИЕ",
      headline: "ПРАВИЛА С ОСТРИНКОЙ.",
      sub: "Прочитайте спеку. Потом ещё раз.",
      wrap: "ЦИКЛИЧЕСКИЙ ПЕРЕНОС",
      wrapEq: "1 000 000 + 1 = −999 999",
      cycle: "ЦИКЛИЧЕСКИЕ ИНДЕКСЫ",
      cycleSub: "индекс 4 в [4, 8, 15] — это 8",
      unicode: "КОДОВЫЕ ТОЧКИ UNICODE",
      unicodeEq: '"🙂ab" → "ba🙂"',
      neko: "Очевидно, ня.",
      captions: ["Числа заворачиваются на ±1 000 000.", "Эмодзи — тоже личности."],
    },
    s5: {
      label: "ПЕРЕПРОВЕРКА",
      headline: "ПЕРЕПРОВЕРКА НЕ СПИТ.",
      sub: "Каждый взлом. Каждый счёт. Вживую.",
      worker: "ВОРКЕР",
      captions: [
        "Затронутые решения перепроверяются.",
        "Никаких устаревших результатов. Никакой пощады.",
      ],
    },
    s6: {
      label: "СЧЁТ И РЕЙТИНГИ",
      headline: "СЧЁТ = ЧТО ЕЩЁ ПРОХОДИТ.",
      sub: "Не то, что вы решили. То, что выжило.",
      invite: "ТОЛЬКО ПО ПРИГЛАШЕНИЮ",
      inviteSub: "Создавайте ссылки в админке.",
      lives: "9 ЖИЗНЕЙ",
      captions: [
        "Уникальные задачи, что проходят сейчас.",
        "Зовите друзей. И врагов.",
      ],
      scoreLabel: "ОЧК",
    },
    s7: {
      headline: "LANGWARS",
      sub: "Девять жизней. Один общий мир.",
      cta: "СЛОМАЙТЕ ЧТО-НИБУДЬ ПРЕКРАСНОЕ.",
      repo: "github.com/as3rg/LangWars",
      neko: "Ня!",
    },
  },
};
