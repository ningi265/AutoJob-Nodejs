exports.healthCheck = (req, res) => {
  return res.json({
    status: 'healthy',
    message: 'Cover Letter App API is running',
  });
};
