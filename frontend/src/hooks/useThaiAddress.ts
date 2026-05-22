import { useMemo } from 'react'
import provinces from '@/data/thai-address/province.json'
import districts from '@/data/thai-address/district.json'
import subDistricts from '@/data/thai-address/sub_district.json'

export interface ThaiProvince {
  id: number
  name_th: string
}
export interface ThaiDistrict {
  id: number
  name_th: string
  province_id: number
}
export interface ThaiSubDistrict {
  id: number
  name_th: string
  district_id: number
  zip_code: number
}

export function useThaiAddress(provinceId?: number, districtId?: number) {
  const filteredDistricts = useMemo<ThaiDistrict[]>(
    () =>
      provinceId ? (districts as ThaiDistrict[]).filter((d) => d.province_id === provinceId) : [],
    [provinceId],
  )

  const filteredSubDistricts = useMemo<ThaiSubDistrict[]>(
    () =>
      districtId
        ? (subDistricts as ThaiSubDistrict[]).filter((s) => s.district_id === districtId)
        : [],
    [districtId],
  )

  return {
    provinces: provinces as ThaiProvince[],
    districts: filteredDistricts,
    subDistricts: filteredSubDistricts,
  }
}
