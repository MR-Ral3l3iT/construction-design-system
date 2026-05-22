'use client'

import { Modal } from '@construction/ui'
import type { ModalProps } from '@construction/ui'

type FormModalProps = Omit<ModalProps, 'children'> & {
  children: React.ReactNode
}

export function FormModal({ children, ...props }: FormModalProps) {
  return (
    <Modal {...props} size={props.size ?? 'lg'}>
      {children}
    </Modal>
  )
}
