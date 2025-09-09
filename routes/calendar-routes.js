const express = require('express');
const calendarController = require('../controllers/calendarController');
const router = express.Router();

router
  .route('/')
  .get(calendarController.getAllEvents)
  .post(calendarController.createEvent);

router
  .route('/:id')
  .get(calendarController.getEvent)
  .patch(calendarController.updateEvent)
  .delete(calendarController.deleteEvent);

module.exports = router;
