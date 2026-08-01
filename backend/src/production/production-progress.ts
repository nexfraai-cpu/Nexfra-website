export interface ProductionStageDefinition {
  key: string;
  name?: string;
}

export interface ProductionStageRecordInput {
  stageKey?: string;
  stage_key?: string;
  stageName?: string;
  stage_name?: string;
  isCompleted?: boolean;
  is_completed?: boolean;
  completedAt?: string | null;
  completed_at?: string | null;
}

export interface ProductionProgress {
  completedStages: string[];
  totalStages: number;
  completedStageCount: number;
  percentage: number;
  currentStage: string;
  boardColumn: 'Not Started' | 'Work in Progress' | 'Finished';
  isFinished: boolean;
}

export const DEFAULT_PRODUCTION_STAGE_DEFINITIONS: ProductionStageDefinition[] = [
  { key: 'sec_design_sub_design_items_scopeClear', name: 'Scope Clear' },
  { key: 'sec_design_sub_design_items_assemblyDesign', name: 'Assembly Design' },
  { key: 'sec_design_sub_design_items_custom', name: 'Custom Requirements' },
  { key: 'sec_procurement_sub_steel_plates_steelPlates_ordered', name: 'Steel Plates Ordered' },
  { key: 'sec_procurement_sub_steel_plates_steelPlates_received', name: 'Steel Plates Received' },
  { key: 'sec_procurement_sub_steel_section_bars_steelSection_ordered', name: 'Steel Section Ordered' },
  { key: 'sec_procurement_sub_steel_section_bars_steelSection_received', name: 'Steel Section Received' },
  { key: 'sec_procurement_sub_aclass_bop_aClassBop_ordered', name: 'A Class BOP Ordered' },
  { key: 'sec_procurement_sub_aclass_bop_aClassBop_received', name: 'A Class BOP Received' },
  { key: 'sec_procurement_sub_bclass_bop_bClassBop_ordered', name: 'B Class BOP Ordered' },
  { key: 'sec_procurement_sub_bclass_bop_bClassBop_received', name: 'B Class BOP Received' },
  { key: 'sec_procurement_sub_cclass_bop_cClassBop_ordered', name: 'C Class BOP Ordered' },
  { key: 'sec_procurement_sub_cclass_bop_cClassBop_received', name: 'C Class BOP Received' },
  { key: 'sec_cutting_bending_sub_cb_parts_floor_cb', name: 'Floor Cutting and Bending' },
  { key: 'sec_cutting_bending_sub_cb_parts_sb_cb', name: 'Side Board Cutting and Bending' },
  { key: 'sec_cutting_bending_sub_cb_parts_hb_cb', name: 'Head Board Cutting and Bending' },
  { key: 'sec_cutting_bending_sub_cb_parts_tp_cb', name: 'Tail Plate Cutting and Bending' },
  { key: 'sec_fabrication_sub_skd_assemblies_floor_fab', name: 'Floor Fabrication' },
  { key: 'sec_fabrication_sub_skd_assemblies_sideboard_fab', name: 'Sideboard Fabrication' },
  { key: 'sec_fabrication_sub_skd_assemblies_headboard_fab', name: 'Headboard Fabrication' },
  { key: 'sec_fabrication_sub_skd_assemblies_taildoor_fab', name: 'Taildoor Fabrication' },
  { key: 'sec_fabrication_sub_skd_assemblies_subframe_fab', name: 'Subframe Fabrication' },
  { key: 'sec_fabrication_sub_skd_assemblies_accessories_fab', name: 'Accessories Fitment' },
  { key: 'sec_welding_sub_cubing_status_cubing_done', name: 'Cubing Done' },
  { key: 'sec_grinding_sub_grinding_status_grinding_done', name: 'Grinding Done' },
  { key: 'sec_biw_painting_sub_biw_paint_stages_biw_inspection', name: 'BIW Inspection' },
  { key: 'sec_biw_painting_sub_biw_paint_stages_pu_painting', name: 'PU Painting' },
  { key: 'sec_trimming_sub_trimming_fitment_wiring_harness', name: 'Electrical Wiring Harness' },
  { key: 'sec_trimming_sub_trimming_fitment_light_fitting', name: 'Light Fitting and Marker Lamps' },
  { key: 'sec_hydraulics_sub_tipping_cylinder_hyva_175', name: 'Hyva 175' },
  { key: 'sec_hydraulics_sub_tipping_cylinder_hydromen_175', name: 'Hydromen 175' },
  { key: 'sec_hydraulics_sub_tipping_cylinder_wipro_175', name: 'Wipro 175' },
  { key: 'sec_hydraulics_sub_hydraulics_testing_hydraulics_done', name: 'Hydraulics Fitment and Testing Done' },
  { key: 'sec_qc_dispatch_sub_qc_checks_qc_dimensions', name: 'QC Dimensions' },
  { key: 'sec_qc_dispatch_sub_qc_checks_qc_welding', name: 'QC Welding' },
  { key: 'sec_qc_dispatch_sub_qc_checks_qc_hydraulic', name: 'QC Hydraulic' },
  { key: 'sec_qc_dispatch_sub_qc_checks_qc_functional', name: 'QC Functional' },
  { key: 'sec_qc_dispatch_sub_qc_checks_qc_painting', name: 'QC Painting' },
  { key: 'sec_qc_dispatch_sub_qc_checks_qc_visuals', name: 'QC Visuals' },
  { key: 'sec_qc_dispatch_sub_final_dispatch_qc_approved', name: 'Quality Check Approved' },
  { key: 'sec_qc_dispatch_sub_final_dispatch_dispatched', name: 'Dispatched' },
];

export function calculateProductionProgress(
  stageRecords: ProductionStageRecordInput[] = [],
  stageDefinitions: ProductionStageDefinition[] = DEFAULT_PRODUCTION_STAGE_DEFINITIONS,
): ProductionProgress {
  const stageKeys = stageDefinitions.map((stage) => stage.key);
  const stageKeySet = new Set(stageKeys);
  const completed = new Set<string>();

  for (const record of stageRecords || []) {
    const key = String(record.stageKey ?? record.stage_key ?? '');
    if (!key || !stageKeySet.has(key)) continue;
    const isCompleted = Boolean(record.isCompleted ?? record.is_completed);
    if (isCompleted) completed.add(key);
    else completed.delete(key);
  }

  const completedStages = stageKeys.filter((key) => completed.has(key));
  const totalStages = stageKeys.length;
  const completedStageCount = completedStages.length;
  const percentage = totalStages > 0 ? Math.round((completedStageCount / totalStages) * 100) : 0;
  const isFinished = totalStages > 0 && completedStageCount === totalStages;
  const boardColumn = completedStageCount === 0 ? 'Not Started' : isFinished ? 'Finished' : 'Work in Progress';

  return {
    completedStages,
    totalStages,
    completedStageCount,
    percentage,
    currentStage: boardColumn,
    boardColumn,
    isFinished,
  };
}

export function stageRecordsToProgressMap(stageRecords: ProductionStageRecordInput[] = []): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const record of stageRecords || []) {
    const key = String(record.stageKey ?? record.stage_key ?? '');
    if (!key) continue;
    out[key] = Boolean(record.isCompleted ?? record.is_completed);
  }
  return out;
}
