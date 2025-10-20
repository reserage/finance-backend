const express = require('express');
const router = express.Router();
const worldClockController = require('../Controllers/worldClockController');

// 取得使用者的城市列表
router
  .route('/')
  .get(worldClockController.getCities)
  .post(worldClockController.addCity);

router
  .route('/:id')
  .delete(worldClockController.deleteCity)
  .patch(worldClockController.updateCity);

module.exports = router;
