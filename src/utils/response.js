exports.successResponse = (
  res,
  message = "Success",
  data = {},
  statusCode = 200
) => {
  return res.status(statusCode).json({
    statusCode,
    message,
    data,
  });
};

exports.errorResponse = (
  res,
  message = "Error",
  statusCode = 400,
  data = null
) => {
  return res.status(statusCode).json({
    statusCode,
    message,
    data,
  });
};

exports.notFoundResponse = (
  res,
  message = "Not Found",
  statusCode = 404,
  data = null
) => {
  return res.status(statusCode).json({
    statusCode,
    message,
    data,
  });
};

exports.unauthorizedResponse = (
  res,
  message = "Unauthorized",
  statusCode = 401,
  data = null
) => {
  return res.status(statusCode).json({
    statusCode,
    message,
    data,
  });
};
