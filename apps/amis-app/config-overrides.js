const path = require("path");

module.exports = {
  webpack: (config) => {
    config.output.library = `amisApp`;
    config.output.libraryTarget = "umd";
    config.output.globalObject = "window";
    config.output.publicPath = "//localhost:3001/";
    return config;
  },
  devServer: (config) => {
    config.headers = {
      "Access-Control-Allow-Origin": "*",
    };
    config.historyApiFallback = true;
    config.hot = false;
    config.watchContentBase = false;
    config.liveReload = false;
    return config;
  },
};
