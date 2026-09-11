import { Request, Response } from 'express';

export const uploadMultipleImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy file ảnh nào được tải lên',
      });
    }

    const urls = files.map((file) => `/uploads/posts/${file.filename}`);

    res.json({
      success: true,
      message: `Tải lên thành công ${urls.length} hình ảnh`,
      data: {
        urls,
        files: files.map((f, i) => ({
          filename: f.filename,
          originalName: f.originalname,
          size: f.size,
          mimetype: f.mimetype,
          url: urls[i],
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadSingleImage = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy file ảnh nào được tải lên',
      });
    }

    const url = `/uploads/posts/${file.filename}`;

    res.json({
      success: true,
      message: 'Tải lên hình ảnh thành công',
      data: {
        url,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
