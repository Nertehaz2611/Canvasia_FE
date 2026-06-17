import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { ownershipVerificationService } from '../../services/ownershipVerificationService';
import type { OwnershipVerificationResponse } from '../../services/ownershipVerificationService';

interface OwnershipVerificationStatusProps {
  onOpenDialog: () => void;
}

export const OwnershipVerificationStatus: React.FC<OwnershipVerificationStatusProps> = ({
  onOpenDialog,
}) => {
  const [verifications, setVerifications] = useState<OwnershipVerificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApproved, setHasApproved] = useState(false);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const data = await ownershipVerificationService.getUserOwnershipVerifications();
      setVerifications(data);
      
      const approved = await ownershipVerificationService.hasApprovedOwnershipVerification();
      setHasApproved(approved);
    } catch (error) {
      console.error('Failed to load verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon sx={{ mr: 1 }} />;
      case 'REJECTED':
        return <CancelIcon sx={{ mr: 1 }} />;
      case 'PENDING':
        return <ScheduleIcon sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  const premiumCardSx = {
    background: 'linear-gradient(135deg, rgba(242, 200, 121, 0.08), rgba(194, 120, 3, 0.05))',
    border: '1px solid rgba(242, 200, 121, 0.26)',
    color: '#f3f5f1',
  };

  return (
    <Box>
      {hasApproved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          You have verified ownership of your artwork. When you upload new posts similar to your verified work, they will not be flagged as copyright violations.
        </Alert>
      )}

      <Card sx={premiumCardSx}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#ffd58a', fontWeight: 800 }}>Ownership Verification</Typography>
            {!hasApproved && (
              <Button
                variant="contained"
                size="small"
                onClick={onOpenDialog}
                sx={{ bgcolor: '#f2c879', color: '#121712', '&:hover': { bgcolor: '#ffd58a' } }}
              >
                New Verification
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {verifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <InfoIcon sx={{ fontSize: 48, color: '#f2c879', mb: 1 }} />
              <Typography sx={{ color: 'rgba(243, 245, 241, 0.76)' }}>
                No ownership verifications yet
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={onOpenDialog}
                sx={{ mt: 2, borderColor: 'rgba(242, 200, 121, 0.38)', color: '#f2c879' }}
              >
                Start Verification
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {verifications.map((verif) => (
                <Box key={verif.id}>
                  <Box sx={{ p: 2, border: '1px solid rgba(242, 200, 121, 0.2)', borderRadius: 1.5, backgroundColor: 'rgba(10, 14, 9, 0.48)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#f3f5f1' }}>
                          {verif.fullName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(243, 245, 241, 0.68)' }}>
                          {verif.identityDocumentType}: {verif.identityDocumentNumber}
                        </Typography>
                      </Box>
                      <Chip
                        label={verif.status}
                        color={getStatusColor(verif.status) as any}
                        icon={getStatusIcon(verif.status) as any}
                        size="small"
                      />
                    </Box>

                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(243, 245, 241, 0.74)' }}>
                      <strong>Submitted:</strong> {new Date(verif.createdAt).toLocaleDateString()}
                    </Typography>

                    {verif.status === 'REJECTED' && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          <strong>Rejection Reason:</strong> {verif.rejectionReason || 'N/A'}
                        </Typography>
                        {verif.adminNotes && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            <strong>Notes:</strong> {verif.adminNotes}
                          </Typography>
                        )}
                      </Alert>
                    )}

                    {verif.status === 'APPROVED' && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          <strong>Approved on:</strong> {new Date(verif.reviewedAt || '').toLocaleDateString()}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
