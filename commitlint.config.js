/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // ฟีเจอร์ใหม่
        'fix', // แก้ bug
        'docs', // เอกสาร
        'style', // formatting
        'refactor', // refactor code
        'test', // เพิ่ม/แก้ test
        'chore', // งาน build, dependencies
        'perf', // performance
        'ci', // CI/CD
        'revert', // revert commit
      ],
    ],
    'subject-case': [0],
  },
}
