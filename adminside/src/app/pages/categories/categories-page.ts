import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { API_OFFLINE_MESSAGE, ApiError } from '../../core/error';
import { Category } from '../../core/models';

/** Editable state of the category form. */
interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  accentColour: string;
  iconKey: string;
  isActive: boolean;
}

/** The fields a staff member can get wrong. */
type CategoryField = keyof CategoryFormState;

/** Validation messages, keyed by field. */
type CategoryFormErrors = Partial<Record<CategoryField, string>>;

/** A message shown above the category list. */
interface ConsoleNotice {
  tone: 'success' | 'error' | 'warn';
  title: string;
  message: string;
}

/**
 * Maximum lengths accepted by the API.
 *
 * These mirror `validateCategoryPayload` in `api/src/utils/validation.js`
 * exactly, so the browser refuses a value the server would reject before the
 * request is even sent. The server still validates everything again: the client
 * is never trusted.
 */
const CATEGORY_FIELD_LIMITS = { name: 80, slug: 200, description: 255, iconKey: 60 } as const;

/** Slug shape required by the API: lower-case words joined with single dashes. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Hex colour shape required by the API. */
const COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Default colour for a brand new category (the API requires one). */
const DEFAULT_COLOUR = '#17B7A5';

/**
 * Icon keys already used by the seeded categories.
 *
 * They are offered through a `<datalist>` so staff can reuse a known key, but
 * the control stays a free text field because the API accepts any key of up to
 * 60 characters rather than a fixed list.
 */
const ICON_KEYS: readonly string[] = ['run', 'gala', 'auction', 'music', 'community', 'trivia', 'wellness', 'food'];

/**
 * Category management screen.
 *
 * This is the "manipulate event category data" half of the Assessment 3 brief.
 * It drives three endpoints: `GET /api/categories?includeInactive=1` (so retired
 * categories are still listed), `POST`/`PUT /api/categories` for the inline
 * form, and `DELETE /api/categories/:id`, which the API refuses with HTTP 409
 * while any event still references the category.
 *
 * One form is reused for both creating and editing: `editingId()` is `null`
 * while creating and holds the category id while editing. That keeps the
 * validation rules in exactly one place.
 */
@Component({
  selector: 'app-categories-page',
  imports: [RouterLink],
  templateUrl: './categories-page.html'
})
export class CategoriesPage implements OnInit {
  private readonly api = inject(ApiService);

  /** Icon key suggestions offered by the datalist. */
  protected readonly iconKeys = ICON_KEYS;

  /** Field length limits, exposed so the template can show live counters. */
  protected readonly limits = CATEGORY_FIELD_LIMITS;

  /** Every category, including the inactive ones. */
  protected readonly categories = signal<Category[]>([]);

  /** True while the list request is in flight. */
  protected readonly loading = signal(true);

  /** True while a create, update or delete request is in flight. */
  protected readonly saving = signal(false);

  /** Blocking failure, for example the API not running. */
  protected readonly error = signal<string | null>(null);

  /** Success, warning or error message shown above the list. */
  protected readonly notice = signal<ConsoleNotice | null>(null);

  /** Id of the category currently open in the form, or `null` when creating. */
  protected readonly editingId = signal<number | null>(null);

  /** The category a staff member has asked to delete, pending confirmation. */
  protected readonly pendingDelete = signal<Category | null>(null);

  /** Current value of every form control. */
  protected readonly form = signal<CategoryFormState>(this.emptyForm());

  /** Validation messages for the current form values. */
  protected readonly errors = signal<CategoryFormErrors>({});

  /** True once a submit has been attempted, so errors can be announced. */
  protected readonly submitted = signal(false);

  /** Heading for the form panel, which changes with the mode. */
  protected readonly formTitle = computed(() => (this.editingId() === null ? 'Add a category' : 'Edit category'));

  /** Number of categories currently switched off. */
  protected readonly inactiveCount = computed(() => this.categories().filter((item) => item.isActive === false).length);

  /** Loads the list as soon as the screen opens. */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads every category from the API.
   *
   * @param keepNotice Set true when a message is already on screen and should
   *   survive the refresh that follows a save.
   */
  protected load(keepNotice = false): void {
    this.loading.set(true);
    this.error.set(null);
    if (!keepNotice) this.notice.set(null);

    this.api.getCategories(true).subscribe({
      next: (rows) => {
        this.categories.set(rows);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.error.set(error?.message || API_OFFLINE_MESSAGE);
      }
    });
  }

  /** Opens the form in create mode with empty values. */
  protected startCreate(): void {
    this.editingId.set(null);
    this.form.set(this.emptyForm());
    this.errors.set({});
    this.submitted.set(false);
    this.notice.set(null);
  }

  /**
   * Opens the form in edit mode, pre-filled with one category.
   *
   * @param category The category being edited.
   */
  protected startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.form.set({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      accentColour: category.accentColour || DEFAULT_COLOUR,
      iconKey: category.iconKey || '',
      isActive: category.isActive !== false
    });
    this.errors.set({});
    this.submitted.set(false);
    this.notice.set(null);
  }

  /** Closes the form and returns it to create mode. */
  protected cancelEdit(): void {
    this.startCreate();
  }

  /**
   * Writes one form control back into the form signal and re-checks just that
   * field, so a message disappears the moment the value becomes valid.
   *
   * @param field Which control changed.
   * @param value New raw value.
   */
  protected setField<K extends CategoryField>(field: K, value: CategoryFormState[K]): void {
    this.form.update((current) => ({ ...current, [field]: value }));
    const nextErrors = this.validate(this.form());
    this.errors.update((current) => {
      const copy: CategoryFormErrors = { ...current };
      const message = nextErrors[field];
      if (message) copy[field] = message;
      else delete copy[field];
      return copy;
    });
  }

  /**
   * Derives a slug from the name.
   *
   * The slug is what appears in `/search?category=...`, so the rule is the same
   * one the API enforces: lower case, digits and single dashes only.
   */
  protected suggestSlug(): void {
    this.setField('slug', this.slugify(this.form().name));
  }

  /**
   * Validates every field and either saves the category or shows the errors.
   *
   * `preventDefault` stops the browser from navigating away, which is what a
   * plain HTML form would do by default. The console deliberately avoids
   * `FormsModule` so that every rule lives in TypeScript, where the compiler
   * checks it and it can be read next to the API's own rules.
   *
   * @param event The DOM submit event.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    const found = this.validate(this.form());
    this.errors.set(found);

    const firstBroken = (Object.keys(found) as CategoryField[])[0];
    if (firstBroken) {
      this.focusField(firstBroken);
      return;
    }

    const id = this.editingId();
    const payload = this.toPayload(this.form());
    this.saving.set(true);
    this.notice.set(null);

    const request = id === null ? this.api.createCategory(payload) : this.api.updateCategory(id, payload);

    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.notice.set({
          tone: 'success',
          title: id === null ? 'Category created' : 'Category updated',
          message: `"${saved.name}" was saved and the list has been refreshed.`
        });
        this.startCreate();
        this.load(true);
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.notice.set({
          tone: error?.status === 409 ? 'warn' : 'error',
          title: error?.status === 409 ? 'Duplicate category' : 'Could not save the category',
          message: error?.message || API_OFFLINE_MESSAGE
        });
      }
    });
  }

  /**
   * Asks the staff member to confirm a delete.
   *
   * @param category The category being removed.
   */
  protected askRemove(category: Category): void {
    this.notice.set(null);
    this.pendingDelete.set(category);
  }

  /** Abandons a pending delete. */
  protected cancelRemove(): void {
    this.pendingDelete.set(null);
  }

  /**
   * Deletes the confirmed category.
   *
   * A category that events still point at cannot be removed. The API answers
   * HTTP 409 with an explanation, which is shown as a warning because the rule
   * has simply protected the event data.
   */
  protected confirmRemove(): void {
    const category = this.pendingDelete();
    if (!category) return;

    this.saving.set(true);
    this.notice.set(null);

    this.api.deleteCategory(category.id).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.pendingDelete.set(null);
        this.notice.set({
          tone: 'success',
          title: 'Category deleted',
          message: `${result.message} The list has been refreshed.`
        });
        if (this.editingId() === category.id) this.startCreate();
        this.load(true);
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.pendingDelete.set(null);
        this.notice.set({
          tone: error?.status === 409 ? 'warn' : 'error',
          title: error?.status === 409 ? 'Delete blocked' : 'Could not delete the category',
          message: error?.message || API_OFFLINE_MESSAGE
        });
      }
    });
  }

  /**
   * True when the card belongs to the category currently open in the form.
   *
   * @param category The card being drawn.
   */
  protected isEditing(category: Category): boolean {
    return this.editingId() === category.id;
  }

  /** Empty form values, used for a new category. */
  private emptyForm(): CategoryFormState {
    return {
      name: '',
      slug: '',
      description: '',
      accentColour: DEFAULT_COLOUR,
      iconKey: '',
      isActive: true
    };
  }

  /**
   * Validates every field at once and returns every problem it finds.
   *
   * Returning the whole map (rather than the first failure) means the staff
   * member sees all of their mistakes in one pass instead of fixing them one
   * submit at a time.
   *
   * @param form Values currently in the form.
   * @returns A map of field name to message; empty when the form is valid.
   */
  private validate(form: CategoryFormState): CategoryFormErrors {
    const found: CategoryFormErrors = {};
    const name = form.name.trim();
    const slug = form.slug.trim();
    const description = form.description.trim();
    const iconKey = form.iconKey.trim();

    if (!name) found.name = 'A category name is required.';
    else if (name.length > CATEGORY_FIELD_LIMITS.name) found.name = `Keep the name to ${CATEGORY_FIELD_LIMITS.name} characters or fewer.`;

    if (!slug) found.slug = 'A slug is required.';
    else if (slug.length > CATEGORY_FIELD_LIMITS.slug) found.slug = `Keep the slug to ${CATEGORY_FIELD_LIMITS.slug} characters or fewer.`;
    else if (!SLUG_PATTERN.test(slug)) found.slug = 'Use lower-case letters, numbers and single dashes only, for example "coastal-care".';

    if (!description) found.description = 'A short description is required.';
    else if (description.length > CATEGORY_FIELD_LIMITS.description) {
      found.description = `Keep the description to ${CATEGORY_FIELD_LIMITS.description} characters or fewer.`;
    }

    if (!form.accentColour) found.accentColour = 'Pick an accent colour.';
    else if (!COLOUR_PATTERN.test(form.accentColour)) found.accentColour = 'The colour must be a hex value such as #17B7A5.';

    if (!iconKey) found.iconKey = 'An icon key is required.';
    else if (iconKey.length > CATEGORY_FIELD_LIMITS.iconKey) found.iconKey = `Keep the icon key to ${CATEGORY_FIELD_LIMITS.iconKey} characters or fewer.`;

    return found;
  }

  /**
   * Converts the form into the JSON body `POST` and `PUT /api/categories` expect.
   *
   * @param form Values currently in the form.
   */
  private toPayload(form: CategoryFormState): Partial<Category> {
    return {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      accentColour: form.accentColour.toUpperCase(),
      iconKey: form.iconKey.trim(),
      isActive: form.isActive
    };
  }

  /**
   * Moves keyboard focus to the first control that failed validation.
   *
   * @param field Field name to focus.
   */
  private focusField(field: CategoryField): void {
    const element = document.getElementById(`category-${field}`);
    if (element) element.focus();
  }

  /**
   * Turns free text into an API-compatible slug.
   *
   * @param value Free text, typically the category name.
   */
  private slugify(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, CATEGORY_FIELD_LIMITS.slug);
  }
}