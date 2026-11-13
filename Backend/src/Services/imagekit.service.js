
const ImageKit = require("imagekit");

let imagekit;

const getImageKit = () => {
  if (imagekit) return imagekit;

  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } =
    process.env;

  if (
    !IMAGEKIT_PUBLIC_KEY ||
    !IMAGEKIT_PRIVATE_KEY ||
    !IMAGEKIT_URL_ENDPOINT
  ) {
    throw new Error("ImageKit configuration is missing. Check environment variables.");
  }

  imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });

  return imagekit;
};

module.exports = {
  getImageKit,
};
