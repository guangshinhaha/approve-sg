const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  recordType: {
    type: String,
    enum: ['temperature', 'health_check', 'incident', 'medication', 'vaccination', 'checkup', 'allergy', 'condition'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Temperature check
  temperature: {
    value: Number,
    unit: {
      type: String,
      enum: ['celsius', 'fahrenheit'],
      default: 'celsius'
    }
  },
  // Visual health check
  visualCheck: {
    status: {
      type: String,
      enum: ['normal', 'concern', 'urgent']
    },
    notes: String,
    symptoms: [String]
  },
  // Incident/Injury
  incident: {
    type: {
      type: String,
      enum: ['injury', 'illness', 'accident', 'other']
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe']
    },
    description: String,
    treatmentGiven: String,
    location: String  // where on body or where it happened
  },
  // Medication
  medication: {
    name: String,
    dosage: String,
    frequency: String,
    prescribedBy: String,
    startDate: Date,
    endDate: Date,
    administeredBy: String,
    administeredAt: Date,
    reason: String
  },
  // Vaccination
  vaccination: {
    name: String,
    doseNumber: Number,
    manufacturer: String,
    lotNumber: String,
    expirationDate: Date,
    administeredBy: String,
    nextDueDate: Date
  },
  // Allergy information
  allergy: {
    allergen: String,
    reaction: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'life-threatening']
    },
    treatment: String
  },
  // Chronic condition
  condition: {
    name: String,
    diagnosedDate: Date,
    severity: String,
    medication: String,
    specialNeeds: String,
    emergencyProtocol: String
  },
  // General fields
  notes: String,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  followUpNotes: String,
  parentNotified: {
    type: Boolean,
    default: false
  },
  parentNotifiedAt: Date,
  parentResponse: String,
  attachments: [{
    filename: String,
    url: String,
    mimeType: String
  }],
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'ongoing', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for efficient queries
healthRecordSchema.index({ student: 1, date: -1 });
healthRecordSchema.index({ student: 1, recordType: 1 });
healthRecordSchema.index({ date: 1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
