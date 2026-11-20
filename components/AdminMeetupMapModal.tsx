import React from 'react';
import { MeetupMapModal, MeetupMapModalProps } from './MeetupMapModal';

export type AdminMeetupMapModalProps = MeetupMapModalProps;

/**
 * Backward-compatible wrapper preserved so existing imports continue working.
 * The nearby meetups map is now open to all users via MeetupMapModal.
 */
export const AdminMeetupMapModal: React.FC<AdminMeetupMapModalProps> = (props) => {
  return <MeetupMapModal {...props} />;
};

export default AdminMeetupMapModal;
