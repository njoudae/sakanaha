import { useMemo, useState } from "react";
import { mockUniversitiesCatalog } from "@saknaha/constants/mockUniversities";
import type { UniversityLocation } from "@saknaha/shared-types";
import { isValidCoordinates } from "@saknaha/utils/directions";
import { useAuthService } from "../auth";

interface UniversityReferenceSelectorProps {
  selectedUniversity: UniversityLocation | null;
  onChange: (university: UniversityLocation | null) => void;
  city?: string;
  compact?: boolean;
}

export default function UniversityReferenceSelector({
  selectedUniversity,
  onChange,
  city,
  compact = false,
}: UniversityReferenceSelectorProps) {
  const authService = useAuthService();
  const availableBranches = authService.universityBranches.filter(
    (branch) =>
      branch.active &&
      Boolean(branch.id.trim()) &&
      Boolean(branch.universityId.trim()) &&
      Boolean((branch.universityName ?? "").trim()) &&
      Boolean(branch.name.trim()) &&
      Boolean(branch.city.trim()) &&
      isValidCoordinates(branch),
  );
  const universities = useMemo(() => {
    const fromBranches = new Map(
      availableBranches
        .filter((branch) => branch.active && (!city || city === "all" || branch.city === city))
        .map((branch) => [
          branch.universityId,
          {
            id: branch.universityId,
            name: branch.universityName ?? branch.name.split(" - ")[0] ?? branch.name,
            city: branch.city,
            active: true,
          },
        ]),
    );
    for (const university of mockUniversitiesCatalog) {
      if (university.active && (!city || city === "all" || university.city === city)) {
        if (!fromBranches.has(university.id)) fromBranches.set(university.id, university);
      }
    }
    return [...fromBranches.values()];
  }, [availableBranches, city]);
  const [universityId, setUniversityId] = useState(
    selectedUniversity?.universityId ?? universities[0]?.id ?? "",
  );

  const displayedUniversityId = selectedUniversity?.universityId ?? universityId;

  const branches = availableBranches.filter(
    (branch) =>
      branch.active &&
      branch.universityId === displayedUniversityId &&
      (!city || city === "all" || branch.city === city),
  );

  return (
    <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`} dir="rtl">
      <label>
        <span className="label">الجامعة</span>
        <select
          className="field field-select"
          value={displayedUniversityId}
          onChange={(event) => {
            setUniversityId(event.target.value);
            onChange(null);
          }}
          aria-label="اختيار الجامعة"
        >
          <option value="">اختاري الجامعة</option>
          {universities.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">الفرع أو الحرم الجامعي</span>
        <select
          className="field field-select"
          value={selectedUniversity?.id ?? ""}
          onChange={(event) => {
            const branch = branches.find((item) => item.id === event.target.value) ?? null;
            onChange(branch);
          }}
          disabled={!displayedUniversityId || branches.length === 0}
          aria-label="اختيار فرع الجامعة أو الحرم الجامعي"
        >
          <option value="">اختاري الفرع</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
