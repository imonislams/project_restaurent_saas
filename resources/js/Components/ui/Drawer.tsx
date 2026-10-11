import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { PropsWithChildren, ReactNode } from 'react';
import { cn } from './cn';

export default function Drawer({
    show,
    onClose,
    title,
    footer,
    width = 'max-w-md',
    children,
}: PropsWithChildren<{
    show: boolean;
    onClose: () => void;
    title: ReactNode;
    footer?: ReactNode;
    width?: string;
}>) {
    return (
        <Transition show={show} leave="duration-200">
            <Dialog as="div" className="fixed inset-0 z-50" onClose={onClose}>
                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-gray-500/75" />
                </TransitionChild>

                <div className="absolute inset-y-0 right-0 flex max-w-full">
                    <TransitionChild
                        enter="transform transition ease-out duration-200"
                        enterFrom="translate-x-full"
                        enterTo="translate-x-0"
                        leave="transform transition ease-in duration-150"
                        leaveFrom="translate-x-0"
                        leaveTo="translate-x-full"
                    >
                        <DialogPanel className={cn('flex h-full w-screen flex-col bg-white shadow-xl', width)}>
                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                                <DialogTitle className="text-sm font-semibold text-gray-900">{title}</DialogTitle>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                                    ✕
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                            {footer && <div className="border-t border-gray-100 px-5 py-3">{footer}</div>}
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}
