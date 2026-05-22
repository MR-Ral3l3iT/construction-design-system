// Load .env.test for all unit tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.test') })
