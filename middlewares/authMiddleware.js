
const checkLogin = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log("使用者已登入:", req.user);
    return next();
  } else {
    console.log("使用者未登入");
    return res.status(401).json({ message: "使用者未登入，請先登入" });
  }
};

module.exports = {checkLogin};