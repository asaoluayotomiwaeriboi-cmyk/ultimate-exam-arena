const Result = require('../models/Result');
const Subject = require('../models/Subject');

exports.studentOverview = async (req, res, next) => {
  try {
    const history = await Result.find({ student: req.user.id });
    const subjects = await Subject.find({ active: true });
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      history,
      subjects,
    });
  } catch (error) {
    next(error);
  }
};
