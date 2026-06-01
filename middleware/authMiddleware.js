const jwt = require("jsonwebtoken");

exports.isAuthenticated = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  // Agar cookie nahi mil rahi to check karein kya header mein token hai?

  console.log("Cookies found:", req.cookies); // Vercel logs mein check karein

  if (!token) return res.status(401).json({ message: "Please login first" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
