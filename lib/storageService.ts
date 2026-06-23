import { supabase } from './supabaseClient';

// Image Storage Service
export const storageService = {
  /**
   * Upload a product image to Supabase Storage
   * @param file - Image file to upload
   * @param fileName - Optional custom file name (without extension)
   * @returns Public URL of uploaded image or null if error
   */
  async uploadProductImage(file: File, fileName?: string): Promise<string | null> {
    try {
      // Generate unique file name if not provided
      const name =
        fileName || `product-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const fileExt = file.name.split('.').pop();
      const fullFileName = `${name}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fullFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('products').getPublicUrl(fullFileName);

      return publicUrl;
    } catch (err) {
      console.error('Upload exception:', err);
      return null;
    }
  },

  /**
   * Upload multiple images and return array of URLs
   * @param files - Array of image files
   * @returns Array of public URLs for successfully uploaded images
   */
  async uploadMultipleImages(files: File[]): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      const url = await this.uploadProductImage(file);
      if (url) urls.push(url);
    }

    return urls;
  },

  /**
   * Delete an image from Supabase Storage
   * @param fileUrl - Full public URL of the image
   * @returns true if successful, false if error
   */
  async deleteProductImage(fileUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL: https://.../{bucket}/{file_path}
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('products');
      if (bucketIndex === -1) {
        console.error('Invalid file URL for deletion');
        return false;
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage.from('products').remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Delete exception:', err);
      return false;
    }
  },

  /**
   * Get public URL for a file path
   * @param filePath - Path of file in storage bucket
   * @returns Public URL
   */
  getPublicUrl(filePath: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from('products').getPublicUrl(filePath);
    return publicUrl;
  },
};
