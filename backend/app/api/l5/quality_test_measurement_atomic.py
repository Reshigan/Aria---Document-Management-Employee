from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class MeasurementUpdate(BaseModel):
    measured_value: float
    result: str  # PASS, FAIL
    notes: str = None


@router.get("/quality-test-measurement/{measurement_id}/atomic-detail")
async def get_quality_test_measurement_atomic_detail(
    measurement_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single quality test measurement"""
    try:
        company_id = current_user.get("company_id", "default")
        
        measurement_query = text("""
            SELECT 
                qtm.id,
                qtm.test_result_id,
                qtr.inspection_id,
                qi.inspection_number,
                qtm.test_parameter,
                qtm.specification_min,
                qtm.specification_max,
                qtm.target_value,
                qtm.measured_value,
                qtm.tolerance,
                qtm.result,
                qtm.measurement_unit,
                qtm.measurement_method,
                qtm.equipment_used,
                qtm.measured_by,
                qtm.measured_at,
                qtm.notes
            FROM quality_test_measurements qtm
            JOIN quality_test_results qtr ON qtm.test_result_id = qtr.id
            JOIN quality_inspections qi ON qtr.inspection_id = qi.id
            WHERE qtm.id = :measurement_id AND qtm.company_id = :company_id
        """)
        
        measurement_result = db.execute(measurement_query, {
            "measurement_id": measurement_id,
            "company_id": company_id
        }).fetchone()
        
        if not measurement_result:
            raise HTTPException(status_code=404, detail="Quality test measurement not found")
        
        measured_value = float(measurement_result[8]) if measurement_result[8] else 0
        target_value = float(measurement_result[7]) if measurement_result[7] else 0
        spec_min = float(measurement_result[5]) if measurement_result[5] else 0
        spec_max = float(measurement_result[6]) if measurement_result[6] else 0
        
        deviation = measured_value - target_value
        deviation_percent = (deviation / target_value * 100) if target_value > 0 else 0
        
        is_within_spec = spec_min <= measured_value <= spec_max if spec_min and spec_max else True
        
        history_query = text("""
            SELECT 
                qtm.id,
                qtm.measured_value,
                qtm.result,
                qtm.measured_at,
                qi.inspection_number
            FROM quality_test_measurements qtm
            JOIN quality_test_results qtr ON qtm.test_result_id = qtr.id
            JOIN quality_inspections qi ON qtr.inspection_id = qi.id
            WHERE qtm.test_parameter = :test_parameter
                AND qtm.id != :measurement_id
                AND qtm.company_id = :company_id
            ORDER BY qtm.measured_at DESC
            LIMIT 10
        """)
        
        history_result = db.execute(history_query, {
            "test_parameter": measurement_result[4],
            "measurement_id": measurement_id,
            "company_id": company_id
        })
        
        historical_measurements = []
        for row in history_result.fetchall():
            historical_measurements.append({
                "id": row[0],
                "measured_value": float(row[1]) if row[1] else 0,
                "result": row[2],
                "measured_at": str(row[3]) if row[3] else None,
                "inspection_number": row[4]
            })
        
        return {
            "measurement": {
                "id": measurement_result[0],
                "test_result_id": measurement_result[1],
                "inspection_id": measurement_result[2],
                "inspection_number": measurement_result[3],
                "test_parameter": measurement_result[4],
                "specification_min": spec_min,
                "specification_max": spec_max,
                "target_value": target_value,
                "measured_value": measured_value,
                "tolerance": float(measurement_result[9]) if measurement_result[9] else 0,
                "result": measurement_result[10],
                "measurement_unit": measurement_result[11],
                "measurement_method": measurement_result[12],
                "equipment_used": measurement_result[13],
                "measured_by": measurement_result[14],
                "measured_at": str(measurement_result[15]) if measurement_result[15] else None,
                "notes": measurement_result[16]
            },
            "analysis": {
                "deviation_from_target": deviation,
                "deviation_percent": deviation_percent,
                "is_within_specification": is_within_spec,
                "distance_from_min": measured_value - spec_min if spec_min else None,
                "distance_from_max": spec_max - measured_value if spec_max else None
            },
            "historical_measurements": historical_measurements
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/quality-test-measurement/{measurement_id}")
async def update_quality_test_measurement(
    measurement_id: int,
    update_data: MeasurementUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a quality test measurement"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE quality_test_measurements
            SET 
                measured_value = :measured_value,
                result = :result,
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            WHERE id = :measurement_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "measured_value": update_data.measured_value,
            "result": update_data.result,
            "notes": update_data.notes,
            "measurement_id": measurement_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Quality test measurement updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
