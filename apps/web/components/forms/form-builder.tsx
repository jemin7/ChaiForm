"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Check,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  MessageSquareText,
  Plus,
  QrCode,
  Save,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import type { FieldType } from "@repo/validators";

import { FormPreview } from "~/components/forms/form-preview";
import { ShareDialog } from "~/components/forms/share-dialog";
import type { BuilderField, BuilderForm } from "~/components/forms/form-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { trpc } from "~/trpc/client";

const fieldTypes: Array<{ value: FieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "rating", label: "Rating" },
  { value: "date", label: "Date" },
  { value: "file", label: "File upload" },
];

const optionTypes: FieldType[] = ["select", "checkbox"];

interface FormBuilderProps {
  initialForm?: BuilderForm;
}

export function FormBuilder({ initialForm }: FormBuilderProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  // Baseline for the "All changes saved" indicator — reset after each save.
  const [savedJson, setSavedJson] = useState<string>(() =>
    JSON.stringify(initialForm ?? { title: "", description: "", visibility: "private", fields: [] }),
  );

  // Refetch on mount so the daily credit reset (server-side, UTC) shows up
  // without a full page reload — the global staleTime is Infinity.
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnMount: "always" });
  const isPro = meQuery.data?.plan === "pro";
  const aiCredits = meQuery.data?.aiCredits;
  // Only lock the AI features when the balance is confirmed to be zero. A
  // failed/empty `me` response must not masquerade as "out of credits" — the
  // server still enforces the real limit and returns a clear error if the
  // user is genuinely out.
  const aiExhausted = !isPro && !!aiCredits && aiCredits.remaining <= 0;

  const generateMutation = trpc.forms.generateWithAI.useMutation({
    onSuccess(draft) {
      setForm((current) => ({
        ...current,
        title: draft.title,
        description: draft.description || null,
        fields: draft.fields.map((field, order) => ({
          clientId: crypto.randomUUID(),
          type: field.type,
          label: field.label,
          placeholder: field.placeholder ?? "",
          required: field.required,
          options: field.options ?? [],
          order,
        })),
      }));
      toast.success("AI draft ready — review it, then save.");
      meQuery.refetch();
    },
    onError(error) {
      toast.error(error.message);
      meQuery.refetch();
    },
  });
  const [form, setForm] = useState<BuilderForm>(
    initialForm ?? {
      title: "",
      description: "",
      visibility: "private",
      fields: [],
    },
  );

  const sortedFields = useMemo(
    () => [...form.fields].sort((a, b) => a.order - b.order),
    [form.fields],
  );

  const createMutation = trpc.forms.create.useMutation({
    onSuccess(createdForm) {
      setSavedJson(JSON.stringify(form));
      toast.success("Draft saved");
      utils.forms.getAllMine.invalidate();
      router.replace(`/dashboard/forms/${createdForm.id}`);
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.forms.update.useMutation({
    onSuccess() {
      setSavedJson(JSON.stringify(form));
      toast.success("Changes saved");
      utils.forms.getAllMine.invalidate();
      if (form.id) {
        utils.forms.getById.invalidate({ id: form.id });
      }
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const publishMutation = trpc.forms.publish.useMutation({
    onSuccess() {
      setSavedJson(JSON.stringify({ ...form, isPublished: true }));
      toast.success("Form published");
      setForm((current) => ({ ...current, isPublished: true }));
      utils.forms.getAllMine.invalidate();
      // Publish is usually triggered from the fixed bottom bar while the user
      // is scrolled down in the builder. Bring the header (Published state,
      // Share / Responses / Analytics actions) back into view so the new
      // navigation isn't left out of sight above the fold.
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Publishing is the moment of highest intent — surface the share link
      // right away instead of making the user hunt for it.
      if (form.slug) {
        setShareOpen(true);
      }
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const unpublishMutation = trpc.forms.unpublish.useMutation({
    onSuccess() {
      setSavedJson(JSON.stringify({ ...form, isPublished: false }));
      toast.success("Form unpublished");
      setForm((current) => ({ ...current, isPublished: false }));
      utils.forms.getAllMine.invalidate();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDirty = useMemo(() => JSON.stringify(form) !== savedJson, [form, savedJson]);

  function addField(type: FieldType = "text") {
    setForm((current) => ({
      ...current,
      fields: [
        ...current.fields,
        {
          clientId: crypto.randomUUID(),
          type,
          label: "Untitled field",
          placeholder: "",
          required: false,
          options: optionTypes.includes(type) ? ["Option 1"] : [],
          maxSelections: null,
          order: current.fields.length,
        },
      ],
    }));
  }

  function updateField(clientId: string, patch: Partial<BuilderField>) {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) => {
        if (field.clientId !== clientId) {
          return field;
        }

        const nextType = patch.type ?? field.type;
        const shouldHaveOptions = optionTypes.includes(nextType);

        const nextOptions =
          patch.options ??
          (field.options.length ? field.options : ["Option 1"]);

        return {
          ...field,
          ...patch,
          options: shouldHaveOptions ? nextOptions : [],
          maxSelections: shouldHaveOptions
            ? (patch.maxSelections !== undefined ? patch.maxSelections : (field.maxSelections ?? null))
            : null,
        };
      }),
    }));
  }

  function removeField(clientId: string) {
    setForm((current) => ({
      ...current,
      fields: current.fields
        .filter((field) => field.clientId !== clientId)
        .map((field, index) => ({
          ...field,
          order: index,
        })),
    }));
  }

  function requestRemoveField(clientId: string) {
    // Removing a field from a form that already has responses permanently
    // deletes its answers — confirm first in that case.
    if ((form.responseCount ?? 0) > 0) {
      setFieldToDelete(clientId);
      return;
    }

    removeField(clientId);
  }

  function duplicateField(clientId: string) {
    setForm((current) => {
      const fields = [...current.fields].sort((a, b) => a.order - b.order);
      const index = fields.findIndex((field) => field.clientId === clientId);
      const source = index >= 0 ? fields[index] : undefined;

      if (!source) {
        return current;
      }

      const copy: BuilderField = {
        ...source,
        clientId: crypto.randomUUID(),
        id: undefined,
        label: source.label && source.label !== "Untitled field" ? `${source.label} (copy)` : "Untitled field",
      };

      const next = [...fields];
      next.splice(index + 1, 0, copy);

      return {
        ...current,
        fields: next.map((item, order) => ({ ...item, order })),
      };
    });
  }

  function moveField(clientId: string, direction: -1 | 1) {
    const fields = [...sortedFields];
    const index = fields.findIndex((field) => field.clientId === clientId);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= fields.length) {
      return;
    }

    const [field] = fields.splice(index, 1);
    if (!field) {
      return;
    }

    fields.splice(target, 0, field);
    setForm((current) => ({
      ...current,
      fields: fields.map((item, order) => ({ ...item, order })),
    }));
  }

  function handleDrop(targetClientId: string) {
    if (!draggedFieldId || draggedFieldId === targetClientId) {
      setDraggedFieldId(null);
      return;
    }

    const fields = [...sortedFields];
    const from = fields.findIndex((field) => field.clientId === draggedFieldId);
    const to = fields.findIndex((field) => field.clientId === targetClientId);

    if (from >= 0 && to >= 0) {
      const [field] = fields.splice(from, 1);
      if (field) {
        fields.splice(to, 0, field);
        setForm((current) => ({
          ...current,
          fields: fields.map((item, order) => ({ ...item, order })),
        }));
      }
    }

    setDraggedFieldId(null);
  }

  function payload() {
    return {
      title: form.title,
      description: form.description || null,
      slug: form.slug?.trim() || undefined,
      visibility: form.visibility,
      notificationsEnabled: form.notificationsEnabled ?? false,
      notifyEmail: form.notifyEmail?.trim() || null,
      thankYouMessage: form.thankYouMessage?.trim() || null,
      fields: sortedFields.map((field, order) => ({
        id: field.id ?? field.clientId,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || null,
        required: field.required,
        options: optionTypes.includes(field.type) ? field.options : undefined,
        maxSelections: optionTypes.includes(field.type) ? (field.maxSelections ?? null) : null,
        order,
      })),
    };
  }

  function saveDraft() {
    if (form.id) {
      updateMutation.mutate({ id: form.id, ...payload() });
      return;
    }

    createMutation.mutate(payload());
  }

  // Keep the latest saveDraft callable from the keyboard shortcut listener.
  const saveDraftRef = useRef(saveDraft);
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveDraftRef.current();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-[2rem] border bg-card/80 p-4 shadow-xl backdrop-blur-xl sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to forms"
              className="shrink-0 rounded-2xl"
              onClick={() => router.push("/dashboard/forms")}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {form.title || "Untitled form"}
                </h2>
                {form.isPublished ? (
                  <Badge className="rounded-full">Published</Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-full">
                    Draft
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {isSaving ? (
                  <>
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : isDirty ? (
                  <>
                    <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                    Unsaved changes
                  </>
                ) : (
                  <>
                    <Check className="size-3 text-emerald-500" aria-hidden="true" />
                    <span className="text-emerald-600 dark:text-emerald-400">All changes saved</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {form.id ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-2xl"
                onClick={() => router.push(`/dashboard/forms/${form.id}/responses`)}
              >
                <MessageSquareText aria-hidden="true" />
                Responses
              </Button>
            ) : null}
            {form.id ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-2xl"
                onClick={() => router.push(`/dashboard/forms/${form.id}/analytics`)}
              >
                <BarChart3 aria-hidden="true" />
                Analytics
              </Button>
            ) : null}
            {form.isPublished && form.slug ? (
              <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setShareOpen(true)}>
                <QrCode aria-hidden="true" />
                Share
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="rounded-2xl" onClick={saveDraft} disabled={isSaving}>
              <Save aria-hidden="true" />
              {isSaving ? "Saving..." : "Save draft"}
            </Button>
            {form.id ? (
              <Button
                size="sm"
                className="rounded-2xl"
                onClick={() =>
                  form.isPublished
                    ? unpublishMutation.mutate({ id: form.id! })
                    : publishMutation.mutate({ id: form.id! })
                }
                disabled={publishMutation.isPending || unpublishMutation.isPending}
              >
                <Send aria-hidden="true" />
                {form.isPublished ? "Unpublish" : "Publish"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="rounded-2xl bg-card/80 p-1 backdrop-blur">
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye aria-hidden="true" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 aria-hidden="true" />
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="builder" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-emerald-500/20 bg-card/80 shadow-xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-500" aria-hidden="true" />
                    Generate with AI
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Describe the form you need and ChaiForm builds the questions for you.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {meQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Checking your credits…</p>
                  ) : (
                    <>
                      <Textarea
                        value={aiPrompt}
                        onChange={(event) => setAiPrompt(event.target.value)}
                        placeholder="e.g. A customer feedback form for our new mobile app, with a rating and a question about what to improve next"
                        rows={3}
                        maxLength={1000}
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          className="rounded-2xl"
                          onClick={() => generateMutation.mutate({ prompt: aiPrompt })}
                          disabled={aiPrompt.trim().length < 3 || generateMutation.isPending || aiExhausted}
                        >
                          <Wand2 aria-hidden="true" />
                          {generateMutation.isPending ? "Generating…" : "Generate draft"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {isPro
                            ? "Unlimited AI generations included with Pro."
                            : aiCredits
                              ? `${aiCredits.remaining} of ${aiCredits.allowance} AI credits left today — they reset daily.`
                              : "Credit balance unavailable right now — try again in a moment."}
                        </p>
                      </div>
                      {aiExhausted ? (
                        <p className="text-sm text-destructive">
                          You&apos;re out of AI credits for today. They reset daily.
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Replaces the fields below with an AI draft — review it before saving.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Form details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Startup feedback"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Tell respondents what this form is about."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={form.slug ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, slug: event.target.value }))
                      }
                      placeholder="auto-generated"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <select
                      id="visibility"
                      value={form.visibility}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          visibility: event.target.value as BuilderForm["visibility"],
                        }))
                      }
                    className="h-10 w-full rounded-2xl border bg-background px-3 text-sm"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Fields</CardTitle>
                  <Button onClick={() => addField()} size="sm" className="rounded-2xl">
                    <Plus aria-hidden="true" />
                    Add field
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedFields.length ? (
                    sortedFields.map((field, index) => (
                      <FieldEditor
                        key={field.clientId}
                        field={field}
                        index={index}
                        isFirst={index === 0}
                        isLast={index === sortedFields.length - 1}
                        onUpdate={(patch) => updateField(field.clientId, patch)}
                        onRemove={() => requestRemoveField(field.clientId)}
                        onDuplicate={() => duplicateField(field.clientId)}
                        onMove={(direction) => moveField(field.clientId, direction)}
                        onDragStart={() => setDraggedFieldId(field.clientId)}
                        onDrop={() => handleDrop(field.clientId)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed p-8 text-center">
                      <p className="text-sm font-medium">No fields yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add your first question to start building this form.
                      </p>
                      <Button className="mt-4 rounded-2xl" onClick={() => addField()}>
                        <Plus aria-hidden="true" />
                        Add field
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="sticky top-24 rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Quick add</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {fieldTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant="outline"
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => addField(type.value)}
                    >
                      {type.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
              <FormPreview title={form.title} description={form.description} fields={sortedFields} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="preview">
          <FormPreview title={form.title} description={form.description} fields={sortedFields} />
        </TabsContent>
        <TabsContent value="settings" className="space-y-6">
          <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <p className="text-sm text-muted-foreground">
                Get an email whenever someone submits this form.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                <div>
                  <Label>Email me on new responses</Label>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Sends a summary with the answers to your inbox.
                  </p>
                </div>
                <Switch
                  checked={form.notificationsEnabled ?? false}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, notificationsEnabled: checked }))
                  }
                />
              </div>
              {form.notificationsEnabled ? (
                <div className="space-y-2">
                  <Label htmlFor="notify-email">Send to (optional)</Label>
                  <Input
                    id="notify-email"
                    type="email"
                    value={form.notifyEmail ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notifyEmail: event.target.value || null }))
                    }
                    placeholder="you@example.com — defaults to your account email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the email address on your account.
                  </p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Email delivery requires the server to have RESEND_API_KEY configured.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[2rem] bg-card/80 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Thank-you message</CardTitle>
              <p className="text-sm text-muted-foreground">
                Shown to respondents after they submit this form.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                id="thank-you-message"
                value={form.thankYouMessage ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, thankYouMessage: event.target.value }))
                }
                placeholder="Thanks for your feedback!"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the default thank-you screen.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {form.isPublished && form.slug ? (
        <ShareDialog
          slug={form.slug}
          title={form.title}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      ) : null}
      <AlertDialog open={fieldToDelete !== null} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove field?</AlertDialogTitle>
            <AlertDialogDescription>
              This form already has responses. Removing “
              {fieldToDelete ? sortedFields.find((field) => field.clientId === fieldToDelete)?.label || "Untitled field" : "this field"}
              ” permanently deletes its answers. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (fieldToDelete) {
                  removeField(fieldToDelete);
                }
                setFieldToDelete(null);
              }}
            >
              Remove field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-3xl rounded-[2rem] border bg-card/90 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-sm">
            <p className="font-medium">{form.title || "Untitled form"}</p>
            <p className="text-muted-foreground">{sortedFields.length} fields ready</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {form.isPublished && form.slug ? (
              <Button variant="outline" className="rounded-2xl" onClick={() => setShareOpen(true)}>
                <QrCode aria-hidden="true" />
                Share
              </Button>
            ) : null}
            <Button variant="outline" className="rounded-2xl" onClick={saveDraft} disabled={isSaving}>
              <Save aria-hidden="true" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {form.id ? (
              <Button
                className="rounded-2xl"
                onClick={() =>
                  form.isPublished
                    ? unpublishMutation.mutate({ id: form.id! })
                    : publishMutation.mutate({ id: form.id! })
                }
                disabled={publishMutation.isPending || unpublishMutation.isPending}
              >
                <Send aria-hidden="true" />
                {form.isPublished ? "Unpublish" : "Publish"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldEditorProps {
  field: BuilderField;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<BuilderField>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDrop: () => void;
}

function FieldEditor({
  field,
  index,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
  onDragStart,
  onDrop,
}: FieldEditorProps) {
  const hasOptions = optionTypes.includes(field.type);

  return (
    <motion.div
      draggable
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="rounded-[1.5rem] border bg-background/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <GripVertical className="size-4" aria-hidden="true" />
          Field {index + 1}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={isFirst}>
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={isLast}>
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDuplicate} aria-label="Duplicate field">
            <Copy aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove field">
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <Label htmlFor={`field-label-${field.clientId}`}>Label</Label>
          <Input
            id={`field-label-${field.clientId}`}
            value={field.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`field-type-${field.clientId}`}>Type</Label>
          <select
            id={`field-type-${field.clientId}`}
            value={field.type}
            onChange={(event) => onUpdate({ type: event.target.value as FieldType })}
            className="h-10 w-full rounded-2xl border bg-background px-3 text-sm"
          >
            {fieldTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        {!["rating", "date", "checkbox", "file"].includes(field.type) && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`field-placeholder-${field.clientId}`}>Placeholder</Label>
            <Input
              id={`field-placeholder-${field.clientId}`}
              value={field.placeholder ?? ""}
              onChange={(event) => onUpdate({ placeholder: event.target.value })}
            />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Switch
          id={`field-required-${field.clientId}`}
          checked={field.required}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
        />
        <Label htmlFor={`field-required-${field.clientId}`}>Required</Label>
      </div>
      {hasOptions ? (
        <>
          <Separator className="my-4" />
          <div className="space-y-3">
            <Label>Options</Label>
            {field.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex gap-2">
                <Input
                  aria-label={`Option ${optionIndex + 1}`}
                  value={option}
                  onChange={(event) => {
                    const nextOptions = [...field.options];
                    nextOptions[optionIndex] = event.target.value;
                    onUpdate({ options: nextOptions });
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Remove option ${optionIndex + 1}`}
                  onClick={() =>
                    onUpdate({
                      options: field.options.filter((_, currentIndex) => currentIndex !== optionIndex),
                    })
                  }
                  disabled={field.options.length === 1}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdate({ options: [...field.options, `Option ${field.options.length + 1}`] })}
            >
              <Plus aria-hidden="true" />
              Add option
            </Button>
            <div className="space-y-2 pt-2">
              <Label htmlFor={`max-selections-${field.clientId}`}>Max selections</Label>
              <Input
                id={`max-selections-${field.clientId}`}
                type="number"
                min={1}
                max={20}
                value={field.maxSelections ?? ""}
                placeholder="No limit"
                onChange={(event) => {
                  const raw = event.target.value;
                  onUpdate({
                    maxSelections: raw === "" ? null : Math.max(1, Math.min(20, Number(raw))),
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Limit how many options respondents can pick. Leave empty for no limit — a select stays
                single-choice.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}

