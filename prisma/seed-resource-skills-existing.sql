BEGIN;

CREATE TEMP TABLE approved_course_skills (
    course_id       text NOT NULL,
    skill_id        integer NOT NULL,
    coverage_weight numeric(4, 3) NOT NULL,
    PRIMARY KEY (course_id, skill_id)
) ON COMMIT DROP;

INSERT INTO approved_course_skills (
    course_id,
    skill_id,
    coverage_weight
)
VALUES
    ('CIS5150', 2,  0.700), -- MATLAB
    ('CIS5210', 10, 0.800), -- Python
    ('CIS5450', 10, 0.700), -- Python
    ('CIS5470', 14, 0.900), -- C++
    ('CIS5490', 14, 0.900), -- C++
    ('CIS5500', 54, 0.900), -- SQL
    ('CIS5510', 16, 0.900), -- JavaScript
    ('CIS5530', 37, 0.800), -- C
    ('CIS5530', 14, 0.800), -- C++
    ('CIS5690', 37, 0.800), -- C
    ('CIS5690', 14, 0.800), -- C++
    ('CIT5910', 10, 0.900), -- Python
    ('CIT5910', 52, 0.900), -- Java
    ('CIT5930', 37, 0.900), -- C
    ('CIT5930', 1,  0.800), -- Assembly
    ('CIT5940', 52, 0.900), -- Java
    ('CIT5950', 37, 0.900), -- C
    ('EAS5830', 24, 0.800), -- Solidity
    ('EAS5830', 10, 0.600), -- Python
    ('ESE5410', 10, 0.700), -- Python
    ('ESE5420', 10, 0.700); -- Python

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM approved_course_skills AS approved
        LEFT JOIN courses AS course
            ON course.course_id = approved.course_id
        WHERE course.course_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Some approved course IDs do not exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM approved_course_skills AS approved
        LEFT JOIN skills AS skill
            ON skill.id = approved.skill_id
        WHERE skill.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Some approved skill IDs do not exist';
    END IF;
END
$$;

INSERT INTO resource_skills (
    resource_id,
    skill_id,
    coverage_weight
)
SELECT
    course.resource_id,
    approved.skill_id,
    approved.coverage_weight
FROM approved_course_skills AS approved
JOIN courses AS course
    ON course.course_id = approved.course_id
ON CONFLICT (resource_id, skill_id)
DO UPDATE SET
    coverage_weight = EXCLUDED.coverage_weight;

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM approved_course_skills AS approved
        JOIN courses AS course
            ON course.course_id = approved.course_id
        JOIN resource_skills AS resource_skill
            ON resource_skill.resource_id = course.resource_id
           AND resource_skill.skill_id = approved.skill_id
           AND resource_skill.coverage_weight = approved.coverage_weight
    ) <> 21 THEN
        RAISE EXCEPTION 'Not all approved resource skills were upserted';
    END IF;
END
$$;

COMMIT;
