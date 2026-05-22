'use client'

import { useState, useEffect, useMemo } from 'react'
import { Select } from '@construction/ui'
import { useThaiAddress } from '@/hooks/useThaiAddress'

interface ThaiAddressValue {
  province: string
  district: string
  subdistrict: string
  postcode: string
}

interface Props {
  value: ThaiAddressValue
  onChange: (val: ThaiAddressValue) => void
  errors?: Partial<Record<keyof ThaiAddressValue, string>>
}

export function ThaiAddressFields({ value, onChange, errors }: Props) {
  const [provinceId, setProvinceId] = useState<number | undefined>()
  const [districtId, setDistrictId] = useState<number | undefined>()
  const { provinces, districts, subDistricts } = useThaiAddress(provinceId, districtId)

  // Sync IDs when editing existing data
  useEffect(() => {
    if (value.province && !provinceId) {
      const p = provinces.find((x) => x.name_th === value.province)
      if (p) setProvinceId(p.id)
    }
  }, [value.province, provinceId, provinces])

  useEffect(() => {
    if (value.district && provinceId && !districtId) {
      const d = districts.find((x) => x.name_th === value.district)
      if (d) setDistrictId(d.id)
    }
  }, [value.district, districtId, provinceId, districts])

  const provinceOptions = useMemo(
    () => provinces.map((p) => ({ value: String(p.id), label: p.name_th })),
    [provinces],
  )

  const districtOptions = useMemo(
    () => districts.map((d) => ({ value: String(d.id), label: d.name_th })),
    [districts],
  )

  const subDistrictOptions = useMemo(
    () => subDistricts.map((s) => ({ value: String(s.id), label: s.name_th })),
    [subDistricts],
  )

  function handleProvince(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value)
    const prov = provinces.find((p) => p.id === id)
    setProvinceId(id || undefined)
    setDistrictId(undefined)
    onChange({ province: prov?.name_th ?? '', district: '', subdistrict: '', postcode: '' })
  }

  function handleDistrict(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value)
    const dist = districts.find((d) => d.id === id)
    setDistrictId(id || undefined)
    onChange({ ...value, district: dist?.name_th ?? '', subdistrict: '', postcode: '' })
  }

  function handleSubDistrict(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value)
    const sub = subDistricts.find((s) => s.id === id)
    onChange({
      ...value,
      subdistrict: sub?.name_th ?? '',
      postcode: sub?.zip_code ? String(sub.zip_code) : '',
    })
  }

  const selectedSubDistrictId = subDistricts.find((s) => s.name_th === value.subdistrict)?.id

  return (
    <>
      <Select
        label="จังหวัด"
        options={provinceOptions}
        value={provinceId ? String(provinceId) : ''}
        onChange={handleProvince}
        placeholder="— เลือกจังหวัด —"
        error={errors?.province}
      />

      <Select
        label="อำเภอ / เขต"
        options={districtOptions}
        value={districtId ? String(districtId) : ''}
        onChange={handleDistrict}
        placeholder={provinceId ? '— เลือกอำเภอ/เขต —' : '— เลือกจังหวัดก่อน —'}
        disabled={!provinceId}
        error={errors?.district}
      />

      <Select
        label="ตำบล / แขวง"
        options={subDistrictOptions}
        value={selectedSubDistrictId ? String(selectedSubDistrictId) : ''}
        onChange={handleSubDistrict}
        placeholder={districtId ? '— เลือกตำบล/แขวง —' : '— เลือกอำเภอก่อน —'}
        disabled={!districtId}
        error={errors?.subdistrict}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">รหัสไปรษณีย์</label>
        <input
          type="text"
          readOnly={!!value.postcode}
          value={value.postcode}
          onChange={(e) => onChange({ ...value, postcode: e.target.value })}
          placeholder="กรอกอัตโนมัติเมื่อเลือกตำบล"
          className={[
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-150',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            value.postcode
              ? 'border-gray-200 bg-gray-50 text-gray-600'
              : 'border-gray-300 bg-white text-gray-900',
          ].join(' ')}
        />
      </div>
    </>
  )
}
