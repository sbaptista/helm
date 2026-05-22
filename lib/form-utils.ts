/**
 * After validation fails, scroll the first error field into view.
 * Call this right after setting error state — uses requestAnimationFrame
 * to wait for the DOM to reflect the error styles.
 *
 * Looks for elements with `role="alert"` (FormField error messages)
 * inside the nearest open dialog.
 */
export function scrollToFirstError() {
  requestAnimationFrame(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]')
    if (!dialog) return
    const firstAlert = dialog.querySelector('[role="alert"]')
    if (firstAlert) {
      firstAlert.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}
