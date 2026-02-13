/**
 * 설정 상수
 */
const CONFIG = {
    // 점심시간
    LUNCH_START_HOUR: 11,
    LUNCH_START_MIN: 30,
    LUNCH_END_HOUR: 12,
    LUNCH_END_MIN: 30,
    LUNCH_DURATION: 1, // hours

    // 근무 기준
    STANDARD_HOURS: 8,
    MAX_WEEKLY_HOURS: 52,
    DEFAULT_TARGET: 40,
    MAX_DISPLAY_HOURS: 12,

    // 보상휴가
    REWARD_MULTIPLIER: 1.5,
    HOURS_PER_LEAVE: 8,

    // 휴가 단위 (시간)
    LEAVE_UNITS: {
        ANNUAL: 8,      // 연차
        HALF: 4,        // 반차
        QUARTER: 2      // 반반차
    },

    // 코어타임 기본값
    CORE_START_DEFAULT: '12:30',
    CORE_END_DEFAULT: '17:30',

    // 요일
    DAY_NAMES: ['일', '월', '화', '수', '목', '금', '토'],

    // 로컬스토리지 키
    STORAGE_KEYS: {
        DATA: 'worktime_data',
        SETTINGS: 'worktime_settings',
        ADJUSTMENTS: 'worktime_adjustments',
        WEEKENDS: 'worktime_weekends',
        REWARDS: 'worktime_rewards' // 새로 추가된 키
    },

    // 디바운스 딜레이 (ms)
    DEBOUNCE_DELAY: 150
};
