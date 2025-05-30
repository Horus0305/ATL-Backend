import mongoose from 'mongoose';

const testNablScopeSchema = new mongoose.Schema({
  s_no: Number,
  group: String,
  main_group: String,
  sub_group: String,
  material_tested: String,
  parameters: String,
  test_method: String
});

export const TestNablScope = mongoose.model('TestNablScope', testNablScopeSchema, 'test_nabl_scope'); 