-- migrate:up
ALTER TABLE candidate_profiles DROP COLUMN headline,
                               DROP COLUMN skills,
                               DROP COLUMN links;

-- migrate:down

