const City = require('../models/cityModel');

const defaultCities = [
  {
    name: '東京',
    englishName: 'Tokyo',
    country: '日本',
    timezone: 'Asia/Tokyo',
    timezoneOffset: 9,
  },
  {
    name: '首爾',
    englishName: 'Seoul',
    country: '韓國',
    timezone: 'Asia/Seoul',
    timezoneOffset: 9,
  },
  {
    name: '台北',
    englishName: 'Taipei',
    country: '台灣',
    timezone: 'Asia/Taipei',
    timezoneOffset: 8,
  },
  {
    name: '香港',
    englishName: 'Hong Kong',
    country: '中國香港',
    timezone: 'Asia/Hong_Kong',
    timezoneOffset: 8,
  },
  {
    name: '北京',
    englishName: 'Beijing',
    country: '中國',
    timezone: 'Asia/Shanghai',
    timezoneOffset: 8,
  },
  {
    name: '新加坡',
    englishName: 'Singapore',
    country: '新加坡',
    timezone: 'Asia/Singapore',
    timezoneOffset: 8,
  },
  {
    name: '曼谷',
    englishName: 'Bangkok',
    country: '泰國',
    timezone: 'Asia/Bangkok',
    timezoneOffset: 7,
  },
  {
    name: '雅加達',
    englishName: 'Jakarta',
    country: '印尼',
    timezone: 'Asia/Jakarta',
    timezoneOffset: 7,
  },
  {
    name: '德里',
    englishName: 'New Delhi',
    country: '印度',
    timezone: 'Asia/Kolkata',
    timezoneOffset: 5.5,
  },

  {
    name: '倫敦',
    englishName: 'London',
    country: '英國',
    timezone: 'Europe/London',
    timezoneOffset: 0,
  },
  {
    name: '巴黎',
    englishName: 'Paris',
    country: '法國',
    timezone: 'Europe/Paris',
    timezoneOffset: 1,
  },
  {
    name: '柏林',
    englishName: 'Berlin',
    country: '德國',
    timezone: 'Europe/Berlin',
    timezoneOffset: 1,
  },
  {
    name: '馬德里',
    englishName: 'Madrid',
    country: '西班牙',
    timezone: 'Europe/Madrid',
    timezoneOffset: 1,
  },
  {
    name: '羅馬',
    englishName: 'Rome',
    country: '義大利',
    timezone: 'Europe/Rome',
    timezoneOffset: 1,
  },
  {
    name: '莫斯科',
    englishName: 'Moscow',
    country: '俄羅斯',
    timezone: 'Europe/Moscow',
    timezoneOffset: 3,
  },

  {
    name: '紐約',
    englishName: 'New York',
    country: '美國',
    timezone: 'America/New_York',
    timezoneOffset: -5,
  },
  {
    name: '芝加哥',
    englishName: 'Chicago',
    country: '美國',
    timezone: 'America/Chicago',
    timezoneOffset: -6,
  },
  {
    name: '丹佛',
    englishName: 'Denver',
    country: '美國',
    timezone: 'America/Denver',
    timezoneOffset: -7,
  },
  {
    name: '洛杉磯',
    englishName: 'Los Angeles',
    country: '美國',
    timezone: 'America/Los_Angeles',
    timezoneOffset: -8,
  },
  {
    name: '多倫多',
    englishName: 'Toronto',
    country: '加拿大',
    timezone: 'America/Toronto',
    timezoneOffset: -5,
  },
  {
    name: '溫哥華',
    englishName: 'Vancouver',
    country: '加拿大',
    timezone: 'America/Vancouver',
    timezoneOffset: -8,
  },

  {
    name: '聖保羅',
    englishName: 'São Paulo',
    country: '巴西',
    timezone: 'America/Sao_Paulo',
    timezoneOffset: -3,
  },
  {
    name: '布宜諾斯艾利斯',
    englishName: 'Buenos Aires',
    country: '阿根廷',
    timezone: 'America/Argentina/Buenos_Aires',
    timezoneOffset: -3,
  },

  {
    name: '雪梨',
    englishName: 'Sydney',
    country: '澳洲',
    timezone: 'Australia/Sydney',
    timezoneOffset: 10,
  },
  {
    name: '墨爾本',
    englishName: 'Melbourne',
    country: '澳洲',
    timezone: 'Australia/Melbourne',
    timezoneOffset: 10,
  },
  {
    name: '奧克蘭',
    englishName: 'Auckland',
    country: '紐西蘭',
    timezone: 'Pacific/Auckland',
    timezoneOffset: 12,
  },

  {
    name: '開羅',
    englishName: 'Cairo',
    country: '埃及',
    timezone: 'Africa/Cairo',
    timezoneOffset: 2,
  },
  {
    name: '約翰尼斯堡',
    englishName: 'Johannesburg',
    country: '南非',
    timezone: 'Africa/Johannesburg',
    timezoneOffset: 2,
  },
  {
    name: '奈洛比',
    englishName: 'Nairobi',
    country: '肯亞',
    timezone: 'Africa/Nairobi',
    timezoneOffset: 3,
  },
];

exports.getDefaultCities = async (userId) => {
  const citiesWithUser = defaultCities.map((city) => ({
    ...city,
    userId,
  }));

  await City.insertMany(citiesWithUser);
};
