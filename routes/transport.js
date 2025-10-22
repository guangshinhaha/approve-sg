const express = require('express');
const router = express.Router();
const { Bus, BusRoute, TransportRequest } = require('../models/Transport');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// ===== BUS ROUTES =====

// @route   GET /api/transport/buses
// @desc    Get all buses
// @access  Private (admin, teacher)
router.get('/buses', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) query.status = status;

    const buses = await Bus.find(query).sort({ busNumber: 1 });

    res.json({
      success: true,
      count: buses.length,
      data: buses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/transport/buses
// @desc    Add new bus
// @access  Private (admin)
router.post('/buses', authorize('admin'), async (req, res) => {
  try {
    const bus = await Bus.create(req.body);

    res.status(201).json({
      success: true,
      data: bus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/transport/buses/:id
// @desc    Update bus
// @access  Private (admin)
router.put('/buses/:id', authorize('admin'), async (req, res) => {
  try {
    let bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    bus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: bus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/transport/buses/:id
// @desc    Delete bus
// @access  Private (admin)
router.delete('/buses/:id', authorize('admin'), async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Check if bus is assigned to any route
    const route = await BusRoute.findOne({ bus: bus._id, status: 'active' });
    if (route) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bus assigned to active route'
      });
    }

    await Bus.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Bus deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== BUS ROUTE ROUTES =====

// @route   GET /api/transport/routes
// @desc    Get all bus routes
// @access  Private (all authenticated users)
router.get('/routes', async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) query.status = status;

    const routes = await BusRoute.find(query)
      .populate('bus', 'busNumber registrationNumber capacity')
      .populate({
        path: 'stops.students',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ routeNumber: 1 });

    res.json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/transport/routes/:id
// @desc    Get single bus route
// @access  Private
router.get('/routes/:id', async (req, res) => {
  try {
    const route = await BusRoute.findById(req.params.id)
      .populate('bus', 'busNumber registrationNumber capacity model')
      .populate({
        path: 'stops.students',
        populate: { path: 'user', select: 'firstName lastName email phone' }
      });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/transport/routes
// @desc    Create bus route
// @access  Private (admin)
router.post('/routes', authorize('admin'), async (req, res) => {
  try {
    // Calculate occupancy
    let occupancy = 0;
    if (req.body.stops) {
      req.body.stops.forEach(stop => {
        occupancy += stop.students ? stop.students.length : 0;
      });
    }

    const route = await BusRoute.create({
      ...req.body,
      currentOccupancy: occupancy
    });

    // Update students with route assignment
    if (req.body.stops) {
      for (const stop of req.body.stops) {
        if (stop.students && stop.students.length > 0) {
          // Update students - you might want to add a transport field to Student model
          // await Student.updateMany({ _id: { $in: stop.students } }, { busRoute: route._id });
        }
      }
    }

    const populatedRoute = await BusRoute.findById(route._id)
      .populate('bus', 'busNumber registrationNumber')
      .populate({
        path: 'stops.students',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.status(201).json({
      success: true,
      data: populatedRoute
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/transport/routes/:id
// @desc    Update bus route
// @access  Private (admin)
router.put('/routes/:id', authorize('admin'), async (req, res) => {
  try {
    let route = await BusRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Recalculate occupancy if stops are updated
    if (req.body.stops) {
      let occupancy = 0;
      req.body.stops.forEach(stop => {
        occupancy += stop.students ? stop.students.length : 0;
      });
      req.body.currentOccupancy = occupancy;
    }

    route = await BusRoute.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('bus', 'busNumber registrationNumber')
      .populate({
        path: 'stops.students',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/transport/routes/:id/add-student
// @desc    Add student to route stop
// @access  Private (admin)
router.post('/routes/:id/add-student', authorize('admin'), async (req, res) => {
  try {
    const { studentId, stopIndex } = req.body;

    const route = await BusRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check capacity
    if (route.currentOccupancy >= route.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Route is at full capacity'
      });
    }

    // Add student to stop
    if (!route.stops[stopIndex].students) {
      route.stops[stopIndex].students = [];
    }

    // Check if student already on route
    const alreadyExists = route.stops.some(stop =>
      stop.students && stop.students.some(s => s.toString() === studentId)
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: 'Student already assigned to this route'
      });
    }

    route.stops[stopIndex].students.push(studentId);
    route.currentOccupancy += 1;
    await route.save();

    // Notify student and parents
    const student = await Student.findById(studentId).populate('parents user');
    if (student) {
      const recipients = [student.user._id, ...student.parents.map(p => p.user)];

      const notifications = recipients.map(userId => ({
        user: userId,
        type: 'general',
        title: 'Transport Assigned',
        message: `Bus route ${route.routeName} (${route.routeNumber}) has been assigned. Stop: ${route.stops[stopIndex].name}`,
        data: {
          routeId: route._id,
          stopIndex
        },
        relatedStudent: student._id,
        priority: 'high',
        channels: {
          inApp: true,
          email: true
        }
      }));

      await Notification.insertMany(notifications);
    }

    res.json({
      success: true,
      data: route,
      message: 'Student added to route successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/transport/routes/:id
// @desc    Delete bus route
// @access  Private (admin)
router.delete('/routes/:id', authorize('admin'), async (req, res) => {
  try {
    const route = await BusRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    await BusRoute.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== TRANSPORT REQUEST ROUTES =====

// @route   GET /api/transport/requests
// @desc    Get transport requests
// @access  Private (admin)
router.get('/requests', authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) query.status = status;

    const requests = await TransportRequest.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('currentRoute', 'routeNumber routeName')
      .populate('requestedRoute', 'routeNumber routeName')
      .populate('requestedBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/transport/requests
// @desc    Create transport request
// @access  Private
router.post('/requests', async (req, res) => {
  try {
    const request = await TransportRequest.create({
      ...req.body,
      requestedBy: req.user._id
    });

    const populatedRequest = await TransportRequest.findById(request._id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('currentRoute', 'routeNumber routeName')
      .populate('requestedRoute', 'routeNumber routeName');

    res.status(201).json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/transport/requests/:id/review
// @desc    Review transport request
// @access  Private (admin)
router.put('/requests/:id/review', authorize('admin'), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;

    let request = await TransportRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    request.status = status;
    request.reviewNotes = reviewNotes;
    request.reviewedBy = req.user._id;
    request.reviewDate = new Date();

    await request.save();

    // Notify requester
    await Notification.create({
      user: request.requestedBy,
      type: 'general',
      title: 'Transport Request Updated',
      message: `Your transport request has been ${status}`,
      data: {
        requestId: request._id,
        status
      },
      priority: 'high',
      channels: {
        inApp: true,
        email: true
      }
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
