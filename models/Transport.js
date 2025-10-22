const mongoose = require('mongoose');

const busRouteSchema = new mongoose.Schema({
  routeNumber: {
    type: String,
    required: true,
    unique: true
  },
  routeName: {
    type: String,
    required: true
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
  },
  driver: {
    name: String,
    phone: String,
    licenseNumber: String
  },
  attendant: {
    name: String,
    phone: String
  },
  stops: [{
    stopNumber: Number,
    name: {
      type: String,
      required: true
    },
    address: String,
    latitude: Number,
    longitude: Number,
    arrivalTime: String,
    departureTime: String,
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }]
  }],
  schedule: {
    morning: {
      startTime: String,
      endTime: String
    },
    afternoon: {
      startTime: String,
      endTime: String
    }
  },
  operatingDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  }],
  fee: {
    monthly: Number,
    quarterly: Number,
    annually: Number
  },
  capacity: Number,
  currentOccupancy: Number,
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  }
}, {
  timestamps: true
});

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  model: String,
  manufacturer: String,
  year: Number,
  capacity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['standard', 'mini', 'ac', 'non-ac'],
    default: 'standard'
  },
  insuranceDetails: {
    policyNumber: String,
    provider: String,
    expiryDate: Date
  },
  fitnessDetails: {
    certificateNumber: String,
    expiryDate: Date
  },
  maintenance: [{
    date: Date,
    type: String,
    description: String,
    cost: Number,
    nextServiceDate: Date
  }],
  fuelType: {
    type: String,
    enum: ['diesel', 'petrol', 'cng', 'electric']
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'retired'],
    default: 'active'
  }
}, {
  timestamps: true
});

const transportRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  requestType: {
    type: String,
    enum: ['new', 'change_route', 'change_stop', 'cancel'],
    required: true
  },
  currentRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusRoute'
  },
  requestedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusRoute'
  },
  requestedStop: String,
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewDate: Date,
  reviewNotes: String
}, {
  timestamps: true
});

// Index for efficient queries
busRouteSchema.index({ routeNumber: 1, status: 1 });
busSchema.index({ busNumber: 1, status: 1 });
transportRequestSchema.index({ student: 1, status: 1 });

const BusRoute = mongoose.model('BusRoute', busRouteSchema);
const Bus = mongoose.model('Bus', busSchema);
const TransportRequest = mongoose.model('TransportRequest', transportRequestSchema);

module.exports = { BusRoute, Bus, TransportRequest };
