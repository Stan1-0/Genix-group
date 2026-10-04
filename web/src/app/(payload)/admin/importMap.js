import { PhotoStrip as PhotoStrip_c75070e70a13f5663ad2c55864c0df9c } from '@/inquiries/admin/PhotoStrip'
import { ResendButton as ResendButton_65a098ffce518b8158d0f26f5f5cfc99 } from '@/inquiries/admin/ResendButton'
import { InboxSummary as InboxSummary_aca2e4b3f9278f092f852c235d0424e7 } from '@/inquiries/admin/InboxSummary'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { VercelBlobClientUploadHandler as VercelBlobClientUploadHandler_16c82c5e25f430251a3e3ba57219ff4e } from '@payloadcms/storage-vercel-blob/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "@/inquiries/admin/PhotoStrip#PhotoStrip": PhotoStrip_c75070e70a13f5663ad2c55864c0df9c,
  "@/inquiries/admin/ResendButton#ResendButton": ResendButton_65a098ffce518b8158d0f26f5f5cfc99,
  "@/inquiries/admin/InboxSummary#InboxSummary": InboxSummary_aca2e4b3f9278f092f852c235d0424e7,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler": VercelBlobClientUploadHandler_16c82c5e25f430251a3e3ba57219ff4e
}
