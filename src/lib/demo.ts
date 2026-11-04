import type { DemoData, Term, Week } from '../types';
import { addDays, startOfWeek, toIsoDate } from './date';
import type { Language } from '../i18n';

const baseMonday = startOfWeek(new Date());
const term: Term = {
  code: 'demo-term',
  name: '2026—2027学年 第一学期',
  selected: true,
  index: 0,
};

const weeks: Week[] = Array.from({ length: 18 }, (_, index) => {
  const start = addDays(baseMonday, (index - 5) * 7);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(addDays(start, 6)),
    term: term.code,
    current: index === 5,
    number: index + 1,
    name: `第${index + 1}周`,
  };
});

const colors = ['#287a6c', '#586fc2', '#b66e4b', '#7b69a4', '#397f83', '#a45e74'];

export function createDemoData(language: Language = 'zh'): DemoData {
  const en = language === 'en';
  return {
    profile: {
      displayName: en ? 'Lin Zhixia' : '林知夏',
      studentId: '2237****',
      authenticatedAt: new Date().toISOString(),
    },
    terms: [{ ...term, name: en ? '2026–2027 Academic Year · Fall' : term.name }],
    weeks,
    courses: [
      {
        id: 'demo-1',
        code: 'CS101',
        name: en ? 'Data Structures & Algorithms' : '数据结构与算法',
        location: en ? 'Main Building 402' : '主楼 402',
        teachers: en ? 'Prof. Chen' : '陈老师',
        beginSection: 1,
        endSection: 2,
        beginTime: '08:00',
        endTime: '09:35',
        dayOfWeek: 1,
        color: colors[0],
      },
      {
        id: 'demo-2',
        code: 'MATH202',
        name: en ? 'Probability & Statistics' : '概率统计',
        location: en ? 'Teaching Building 3-106' : '教学 3-106',
        teachers: en ? 'Prof. Zhou' : '周老师',
        beginSection: 3,
        endSection: 4,
        beginTime: '09:50',
        endTime: '11:25',
        dayOfWeek: 1,
        color: colors[1],
      },
      {
        id: 'demo-3',
        code: 'AI302',
        name: en ? 'Introduction to Machine Learning' : '机器学习导论',
        location: en ? 'New Main Building B101' : '新主楼 B101',
        teachers: en ? 'Prof. Wang' : '王老师',
        beginSection: 5,
        endSection: 6,
        beginTime: '14:00',
        endTime: '15:35',
        dayOfWeek: 2,
        color: colors[2],
      },
      {
        id: 'demo-4',
        code: 'ENG110',
        name: en ? 'Academic English' : '学术英语',
        location: en ? 'Foreign Languages Building 205' : '外语楼 205',
        teachers: en ? 'Prof. Li' : '李老师',
        beginSection: 7,
        endSection: 8,
        beginTime: '15:50',
        endTime: '17:25',
        dayOfWeek: 3,
        color: colors[3],
      },
      {
        id: 'demo-5',
        code: 'SE210',
        name: en ? 'Software Engineering Practice' : '软件工程实践',
        location: en ? 'Laboratory Building 508' : '实验楼 508',
        teachers: en ? 'Prof. Zhao' : '赵老师',
        beginSection: 1,
        endSection: 4,
        beginTime: '08:00',
        endTime: '11:25',
        dayOfWeek: 4,
        color: colors[4],
      },
      {
        id: 'demo-6',
        code: 'PE105',
        name: en ? 'Badminton' : '羽毛球',
        location: en ? 'Gymnasium' : '体育馆',
        teachers: en ? 'Prof. Sun' : '孙老师',
        beginSection: 9,
        endSection: 10,
        beginTime: '16:40',
        endTime: '18:15',
        dayOfWeek: 4,
        color: colors[5],
      },
      {
        id: 'demo-7',
        code: 'HUM123',
        name: en ? 'Technology & Society' : '科技与社会',
        location: en ? 'Humanities Building 312' : '人文楼 312',
        teachers: en ? 'Prof. He' : '何老师',
        beginSection: 5,
        endSection: 6,
        beginTime: '14:00',
        endTime: '15:35',
        dayOfWeek: 5,
        color: colors[0],
      },
    ],
    signins: [
      {
        courseId: 'demo-signin-1',
        courseName: en ? 'Introduction to Machine Learning' : '机器学习导论',
        beginTime: '14:00',
        endTime: '15:35',
        status: 0,
      },
      {
        courseId: 'demo-signin-2',
        courseName: en ? 'Software Engineering Practice' : '软件工程实践',
        beginTime: '08:00',
        endTime: '11:25',
        status: 1,
      },
    ],
  };
}
