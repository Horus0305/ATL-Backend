import mongoose from "mongoose";

// Add these validation functions at the top of the file
const validateTestId = function (testId) {
  const pattern = /^ATL\/\d{2}\/\d{2}\/T_\d+$/;
  return pattern.test(testId);
};

const validateAtlId = function (atlId) {
  const pattern = /^ATL\/\d{2}\/\d{2}\/\d+$/;
  return pattern.test(atlId);
};

const validateDateFormat = function (dateString) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  return pattern.test(dateString);
};

// Schema for individual test with test values
const individualTestSchema = new mongoose.Schema(
  {
    test: { type: String, required: true },
    standard: { type: String, required: true },
    testResult: { type: String },
    unit: { type: String },
    testValues: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

// Schema for material test details
const testDetailSchema = new mongoose.Schema(
  {
    atlId: {
      type: String,
      required: true,
      validate: {
        validator: validateAtlId,
        message: (props) => `${props.value} is not a valid ATL ID format!`,
      },
    },
    material: { type: String, required: true },
    materialId: { type: String, required: true },
    date: {
      type: String,
      required: true,
      validate: {
        validator: validateDateFormat,
        message: (props) =>
          `${props.value} is not a valid date format! Use YYYY-MM-DD`,
      },
    },
    quantity: { type: String, required: true },
    testType: { type: String, required: true },
    tests: [individualTestSchema],
    reporturl: { type: String },
    equipmenttable: { type: String, trim: true },
    resulttable: { type: String, trim: true },
    testResultStatus: {
      type: String,
      enum: ["Pending", "Results Approved", "Results Rejected"],
      default: "Pending",
    },
    testResultRemark: { type: String },
    testReportApproval: {
      type: Number,
      default: 0,
      enum: [-1, 0, 1, 2], // -1: Rejected, 0: Not sent, 1: Sent for approval, 2: Approved
    },
    reportRemark: { type: String },
    reportMailStatus: { type: Boolean, default: false },
  },
  { _id: false }
);

// Schema for requirements questionnaire
const requirementSchema = new mongoose.Schema(
  {
    testMethods: { type: String, enum: ["yes", "no"] },
    laboratoryCapability: { type: String, enum: ["yes", "no"] },
    appropriateTestMethods: { type: String, enum: ["yes", "no"] },
    decisionRule: { type: String, enum: ["yes", "no"] },
    externalProvider: { type: String, enum: ["yes", "no"] },
  },
  { _id: false }
);

// Job card schema for each department
const jobCardSchema = new mongoose.Schema(
  {
    status: { type: Number, default: 0 },
    remark: { type: String, default: "" },
  },
  { _id: false }
);

// Main material test schema
const materialTestSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    clientName: String,
    contactNo: { type: String, required: true },
    emailId: { type: String, required: true },
    address: { type: String, required: true },

    testId: {
      type: String,
      required: true,
      validate: {
        validator: validateTestId,
        message: (props) => `${props.value} is not a valid Test ID format!`,
      },
    },
    date: {
      type: String,
      required: true,
      validate: {
        validator: validateDateFormat,
        message: (props) =>
          `${props.value} is not a valid date format! Use YYYY-MM-DD`,
      },
    },
    completionDate: {
      type: String,
      validate: {
        validator: validateDateFormat,
        message: (props) =>
          `${props.value} is not a valid date format! Use YYYY-MM-DD`,
      },
    },

    tests: [testDetailSchema],
    requirements: requirementSchema,

    materialReceived: { type: Number, default: 0 },
    rorUrl: {
      type: String,
      default: null,
    },
    proformaUrl: {
      type: String,
      default: null,
    },
    rorStatus: {
      type: Number,
      default: 0,
    },
    proformaStatus: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "Test Data Entered",
        "ROR Generated",
        "Proforma Generated",
        "ROR and Proforma Mailed to Client",
        "Job Card Created",
        "Job Card Sent for Approval",
        "Job Assigned to Testers",
        "Test Values Added",
        "Test Values Approved",
        "Test Values Rejected",
        "Report Generated",
        "Report Sent for Approval",
        "Report Approved",
        "Report Rejected",
        "Report Mailed to Client",
        "Completed",
      ],
      default: "Test Data Entered",
    },
    reportStatus: {
      type: Number,
      default: 0,
    },
    paymentReceived: { type: Boolean, default: false },

    requiredDepartments: {
      type: [String],
      default: [],
    },

    jobCards: {
      chemical: jobCardSchema,
      mechanical: jobCardSchema,
    },

    materialAtlIds: [
      {
        type: String,
        required: true,
        validate: {
          validator: validateAtlId,
          message: (props) => `${props.value} is not a valid ATL ID format!`,
        },
      },
    ],
  },
  {
    collection: "material_test",
    timestamps: true,
  }
);

// Add this static method to the materialTestSchema
materialTestSchema.statics.getLastAtlIdNumber = async function (year, month) {
  // Create a regex pattern to match ATL IDs for the specified year and month
  const pattern = new RegExp(`^ATL/${year}/${month}/\\d+$`);

  // Find all tests with matching ATL IDs
  const tests = await this.find({
    "tests.atlId": { $regex: pattern },
  });

  let maxNumber = 0;
  tests.forEach((test) => {
    test.tests.forEach((t) => {
      if (t.atlId && t.atlId.match(pattern)) {
        const number = parseInt(t.atlId.split("/").pop());
        if (!isNaN(number) && number > maxNumber) {
          maxNumber = number;
        }
      }
    });
  });

  return maxNumber;
};

export const MaterialTest = mongoose.model("MaterialTest", materialTestSchema);
