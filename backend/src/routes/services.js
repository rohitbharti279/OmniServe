const express = require('express');
const { body, validationResult } = require('express-validator');
const Service = require('../models/Service');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all services with filters
router.get('/', async (req, res) => {
  try {
    const { category, search, lat, lng, radius = 10, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Location filter
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const services = await Service.find(query)
      .populate('provider', 'name businessName avatar ratings')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Service.countDocuments(query);

    res.json({
      services,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single service
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'name businessName avatar ratings phone email');
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create service (Provider only)
router.post('/', [
  auth,
  authorize('provider'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Valid price is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('duration').isNumeric().withMessage('Duration is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = new Service({
      ...req.body,
      provider: req.user._id
    });

    await service.save();
    
    // Add service to provider's services array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { services: service._id }
    });

    res.status(201).json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update service (Provider only)
router.put('/:id', [auth, authorize('provider')], async (req, res) => {
  try {
    const service = await Service.findOne({ 
      _id: req.params.id, 
      provider: req.user._id 
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    Object.assign(service, req.body);
    await service.save();

    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;