/* Runs in <head> before first paint (ported from each prototype's head script):
   marks JS as available and hides split headlines until SplitText has cut them.
   Never hidden for reduced motion; a timer reveals them if motion never loads. */
export const EARLY_SCRIPT = `document.documentElement.classList.add("js");if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("h1-pending");setTimeout(function(){document.documentElement.classList.remove("h1-pending")},3000)}`

/* Hub only: the prototype's dock script adds `logo-dock` to <html> at load, which hides the
   header logo until the hero lockup docks into it (scrollY 0 = not docked). Applied here so
   the resting state is identical before the dock script is ported (Task 11 toggles logo-docked). */
export const HUB_EARLY_SCRIPT = EARLY_SCRIPT + `;document.documentElement.classList.add("logo-dock")`
