import axios from 'axios';
import api from './api';
import { CloudinaryUploadService } from './cloudinaryUploadService';

export interface CreateOwnershipVerificationRequest {
  fullName: string;
  dateOfBirth: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  countryCode: string;
  mediaFiles: OwnershipVerificationMediaRequest[];
}

export interface OwnershipVerificationMediaRequest {
  mediaUrl: string;
  publicId: string;
  mediaType: string;
  fileName: string;
  displayOrder: number;
}

export interface OwnershipVerificationResponse {
  id: string;
  userId: string;
  postId?: string;
  fullName: string;
  dateOfBirth: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  countryCode: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  reviewedByAdminName?: string;
  mediaFiles: OwnershipVerificationMediaResponse[];
}

export interface OwnershipVerificationMediaResponse {
  id: string;
  mediaUrl: string;
  mediaType: string;
  fileName: string;
  displayOrder: number;
  createdAt: string;
}

export interface OwnershipArtworkItem {
  verificationId: string;
  mediaId: string;
  mediaUrl: string;
  mediaType: string;
  fileName: string;
  createdAt: string;
  ownerName?: string;
  ownerUserId?: string;
}

export interface ReviewOwnershipVerificationRequest {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
  adminNotes?: string;
}

class OwnershipVerificationServiceClass {
  private readonly cloudinaryUpload = new CloudinaryUploadService();

  private toReadableError(error: unknown, fallback: string): Error {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const responseMessage =
        (error.response?.data as { message?: string } | undefined)?.message?.trim();

      if (responseMessage) {
        return new Error(responseMessage);
      }

      if (error.message?.trim()) {
        return new Error(error.message);
      }
    }

    return new Error(fallback);
  }

  async submitOwnershipVerification(
    request: CreateOwnershipVerificationRequest
  ): Promise<OwnershipVerificationResponse> {
    try {
      const response = await api.post<OwnershipVerificationResponse>(
        '/ownership-verifications',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Failed to submit ownership verification:', error);
      throw this.toReadableError(error, 'Failed to submit ownership verification');
    }
  }

  async uploadVerificationMedia(file: File): Promise<OwnershipVerificationMediaRequest> {
    try {
      const uploadResult = await this.cloudinaryUpload.upload(file, {
        folder: 'ownership_verification',
        resource_type: file.type.includes('pdf') ? 'raw' : 'image',
      });

      return {
        mediaUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        mediaType: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
        fileName: file.name,
        displayOrder: 0,
      };
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw this.toReadableError(error, 'Failed to upload verification media');
    }
  }

  async getOwnershipVerification(verificationId: string): Promise<OwnershipVerificationResponse> {
    try {
      const response = await api.get<OwnershipVerificationResponse>(
        `/ownership-verifications/${verificationId}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get ownership verification:', error);
      throw this.toReadableError(error, 'Failed to get ownership verification');
    }
  }

  async getUserOwnershipVerifications(): Promise<OwnershipVerificationResponse[]> {
    try {
      const response = await api.get<OwnershipVerificationResponse[]>(
        '/ownership-verifications/user/mine'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get user verifications:', error);
      throw this.toReadableError(error, 'Failed to get user verifications');
    }
  }

  async getPendingVerifications(page: number = 0, size: number = 20): Promise<any> {
    try {
      const response = await api.get('/ownership-verifications/pending', {
        params: { page, size },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get pending verifications:', error);
      throw this.toReadableError(error, 'Failed to get pending verifications');
    }
  }

  async getAllVerifications(
    page: number = 0,
    size: number = 20,
    sortBy: string = 'createdAt',
    direction: string = 'DESC'
  ): Promise<any> {
    try {
      const response = await api.get('/ownership-verifications', {
        params: { page, size, sortBy, direction },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get verifications:', error);
      throw this.toReadableError(error, 'Failed to get verifications');
    }
  }

  async reviewOwnershipVerification(
    verificationId: string,
    request: ReviewOwnershipVerificationRequest
  ): Promise<OwnershipVerificationResponse> {
    try {
      const response = await api.put<OwnershipVerificationResponse>(
        `/ownership-verifications/${verificationId}/review`,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Failed to review ownership verification:', error);
      throw this.toReadableError(error, 'Failed to review ownership verification');
    }
  }

  async hasApprovedOwnershipVerification(): Promise<boolean> {
    try {
      const response = await api.get<boolean>('/ownership-verifications/check-approved');
      return response.data;
    } catch (error) {
      console.error('Failed to check approved verification:', error);
      return false;
    }
  }

  async getApprovedOwnershipArtworksForCurrentUser(): Promise<OwnershipArtworkItem[]> {
    const verifications = await this.getUserOwnershipVerifications();
    return this.flattenApprovedArtworks(verifications);
  }

  async getApprovedOwnershipArtworksForAdmin(page: number = 0, size: number = 200): Promise<OwnershipArtworkItem[]> {
    const allRes = await this.getAllVerifications(page, size, 'createdAt', 'DESC');
    const allItems: OwnershipVerificationResponse[] = allRes.content || allRes;
    return this.flattenApprovedArtworks(allItems);
  }

  private flattenApprovedArtworks(verifications: OwnershipVerificationResponse[]): OwnershipArtworkItem[] {
    const approved = verifications.filter((v) => v.status === 'APPROVED');

    return approved.flatMap((verification) => {
      const ownerName = verification.fullName;

      return verification.mediaFiles
        .filter((media) => {
          const type = (media.mediaType || '').toUpperCase();
          return type.startsWith('ARTWORK') || type === 'IMAGE';
        })
        .map((media) => ({
          verificationId: verification.id,
          mediaId: media.id,
          mediaUrl: media.mediaUrl,
          mediaType: media.mediaType,
          fileName: media.fileName,
          createdAt: verification.reviewedAt || verification.createdAt,
          ownerName,
          ownerUserId: verification.userId,
        }));
    });
  }
}

export const ownershipVerificationService = new OwnershipVerificationServiceClass();
