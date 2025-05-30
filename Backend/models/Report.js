const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  test_atlid: String,
  report: {
    data: Buffer,
    contentType: String
  },
  report_date: String,
  reportstatus: Number
});

module.exports = mongoose.model('Report', reportSchema); 