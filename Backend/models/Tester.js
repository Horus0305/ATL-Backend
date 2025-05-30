const mongoose = require('mongoose');

const testerSchema = new mongoose.Schema({
  department: String,
  testid: String,
  t_id: String,
  test: [mongoose.Schema.Types.Mixed],
  date: String
});

module.exports = mongoose.model('Tester', testerSchema); 