import type { Prayer } from '@/types';
import { CloudMoon, Sun, CloudSun, MoonStar, Moon, Users } from 'lucide-react';
import React from 'react';

export const PRAYERS: Prayer[] = [
    {
        id: 'subuh',
        name: 'Subuh',
        time: '04:30',
        type: 'wajib',
        startTime: '03:30',
        endTime: '06:00',
        icon: React.createElement(CloudMoon, { className: 'w-8 h-8' })
    },
    {
        id: 'dzuhur',
        name: 'Dzuhur',
        time: '12:00',
        type: 'wajib',
        startTime: '11:30',
        endTime: '15:00',
        icon: React.createElement(Sun, { className: 'w-8 h-8' })
    },
    {
        id: 'ashar',
        name: 'Ashar',
        time: '15:30',
        type: 'wajib',
        startTime: '15:10',
        endTime: '18:00',
        icon: React.createElement(CloudSun, { className: 'w-8 h-8' })
    },
    {
        id: 'maghrib',
        name: 'Maghrib',
        time: '18:15',
        type: 'wajib',
        startTime: '18:00',
        endTime: '19:15',
        icon: React.createElement(MoonStar, { className: 'w-8 h-8' })
    },
    {
        id: 'isya',
        name: 'Isya',
        time: '19:30',
        type: 'wajib',
        startTime: '19:15',
        endTime: '23:59',
        icon: React.createElement(Moon, { className: 'w-8 h-8' })
    },
    {
        id: 'jumat',
        name: 'Jumat',
        time: '12:00',
        type: 'wajib',
        startTime: '11:00',
        endTime: '13:30',
        isFridayOnly: true,
        icon: React.createElement(Users, { className: 'w-8 h-8' })
    }
];
