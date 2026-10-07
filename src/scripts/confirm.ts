/**
 * Themed replacement for `window.confirm()`.
 *
 * A native `<dialog>` opened with `showModal()` keeps the browser's focus trap,
 * Escape handling and inert background, while the markup inherits the blog's
 * design tokens instead of the unstyled system prompt. The promise resolves
 * `true` only when the confirm button is used.
 */
type ConfirmLabels = {
  message: string;
  confirm: string;
  cancel: string;
};

let dialog: HTMLDialogElement | undefined;
let messageNode: HTMLElement | undefined;
let confirmButton: HTMLButtonElement | undefined;
let cancelButton: HTMLButtonElement | undefined;

function buildDialog(): HTMLDialogElement {
  const element = document.createElement("dialog");
  element.className = "confirm-dialog";
  element.setAttribute("aria-labelledby", "confirm-dialog-message");

  // `<form method="dialog">` closes the dialog with the clicked button's value,
  // so no per-button listeners have to be registered and torn down.
  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "confirm-dialog-form";

  const message = document.createElement("p");
  message.id = "confirm-dialog-message";
  message.className = "confirm-dialog-message";
  message.setAttribute("data-confirm-message", "");
  form.append(message);

  const actions = document.createElement("div");
  actions.className = "confirm-dialog-actions";

  const cancel = document.createElement("button");
  cancel.type = "submit";
  cancel.value = "cancel";
  cancel.className = "confirm-dialog-cancel";
  cancel.dataset.confirmCancel = "";

  const confirm = document.createElement("button");
  confirm.type = "submit";
  confirm.value = "accept";
  confirm.className = "confirm-dialog-confirm";
  confirm.dataset.confirmAccept = "";

  actions.append(cancel, confirm);
  form.append(actions);
  element.append(form);
  document.body.append(element);

  messageNode = message;
  confirmButton = confirm;
  cancelButton = cancel;
  return element;
}

export function confirmAction({
  message,
  confirm,
  cancel,
}: ConfirmLabels): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  const element = (dialog ??= buildDialog());
  // ClientRouter replaces <body> on navigation, which detaches the dialog;
  // `showModal()` throws unless the element is connected again.
  if (!element.isConnected) document.body.append(element);
  // A second `showModal()` while one is open would throw.
  if (element.open) return Promise.resolve(false);
  if (messageNode) messageNode.textContent = message;
  if (confirmButton) confirmButton.textContent = confirm;
  if (cancelButton) cancelButton.textContent = cancel;

  return new Promise(resolve => {
    // Escape leaves `returnValue` untouched, so default it to "cancel".
    element.returnValue = "cancel";
    const onClose = () => {
      element.removeEventListener("click", onBackdrop);
      resolve(element.returnValue === "accept");
    };
    const onBackdrop = (event: MouseEvent) => {
      if (event.target !== element) return;
      // Clicks on the padding also target the dialog, so require the pointer to
      // be outside its box before treating the click as a backdrop dismissal.
      const rect = element.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) element.close("cancel");
    };
    element.addEventListener("close", onClose, { once: true });
    element.addEventListener("click", onBackdrop);
    element.showModal();
  });
}
