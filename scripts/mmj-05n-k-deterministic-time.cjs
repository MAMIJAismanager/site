'use strict'
const epoch = Number.parseInt(process.env.SOURCE_DATE_EPOCH || '1784378700', 10) * 1000
Date.now = () => epoch
