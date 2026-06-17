export interface CloudinaryUploadOptions {
  folder?: string;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  tags?: string[];
  public_id?: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  bytes: number;
  width?: number;
  height?: number;
  resource_type: string;
  format: string;
}

export class CloudinaryUploadService {
  private readonly cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ?? '';
  private readonly uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim() ?? '';

  async upload(
    file: File,
    options?: CloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult> {
    if (!this.cloudName) {
      throw new Error('Cloudinary config missing: set VITE_CLOUDINARY_CLOUD_NAME in frontend .env');
    }

    if (!this.uploadPreset) {
      throw new Error('Cloudinary config missing: set VITE_CLOUDINARY_UPLOAD_PRESET in frontend .env');
    }

    const resourceType = options?.resource_type || 'auto';
    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('resource_type', resourceType);

    if (options?.folder) {
      formData.append('folder', options.folder);
    }

    if (options?.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    if (options?.public_id) {
      formData.append('public_id', options.public_id);
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const cloudinaryMessage: string = error?.error?.message || 'Upload failed';

        if (cloudinaryMessage.toLowerCase().includes('upload preset not found')) {
          throw new Error(
            `Cloudinary upload preset not found: "${this.uploadPreset}". ` +
            'Please create this preset in Cloudinary Settings > Upload (or update VITE_CLOUDINARY_UPLOAD_PRESET).'
          );
        }

        if (cloudinaryMessage.toLowerCase().includes('unsigned')) {
          throw new Error(
            `Cloudinary preset "${this.uploadPreset}" is not configured for unsigned uploads. ` +
            'Please enable Unsigned in Cloudinary Upload Preset settings.'
          );
        }

        throw new Error(cloudinaryMessage);
      }

      const result: CloudinaryUploadResult = await response.json();
      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  /**
   * Generate a Cloudinary URL with transformations
   */
  static generateUrl(
    publicId: string,
    cloudName: string = 'dyygjfco1',
    transformations?: Record<string, string | number>
  ): string {
    let url = `https://res.cloudinary.com/${cloudName}/image/upload`;

    if (transformations) {
      const params = Object.entries(transformations)
        .map(([key, value]) => `${key}_${value}`)
        .join(',');
      url += `/${params}`;
    }

    url += `/${publicId}`;

    return url;
  }
}

export const cloudinaryUploadService = new CloudinaryUploadService();
