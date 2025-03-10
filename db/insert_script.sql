-- Insert random rows into mjesto
insert into projekt.mjesto (id, naziv, pbr)
select i, 'Mjesto ' || i, 10000 + i
from generate_series(1, 50) as i;


-- Insert random rows into student
insert into projekt.student (ime, prezime, datum_rodjenja, mjesto_rodjenja_pbr, adresa, broj_telefona, email, spol, jmbag)
select 
    'StudentIme' || i,
    'StudentPrezime' || i,
    date '1995-01-01' + (random() * 10000)::int,
    (select pbr from projekt.mjesto order by random() limit 1),
    'Adresa ' || i,
    '098' || (random() * 10000000)::int,
    'student' || i || '@example.com',
    case when random() > 0.5 then 'M' else 'F' end,
    lpad((random() * 1000000000)::int::text, 10, '0')
from generate_series(1, 100) as i;

-- Insert random rows into profesor
insert into projekt.profesor (ime, prezime, datum_rodjenja, mjesto_rodjenja_pbr, adresa, broj_telefona, email, zvanje)
select 
    'ProfesorIme' || i,
    'ProfesorPrezime' || i,
    date '1970-01-01' + (random() * 10000)::int,
    (select pbr from projekt.mjesto order by random() limit 1),
    'Adresa ' || i,
    '099' || (random() * 10000000)::int,
    'profesor' || i || '@example.com',
    'ProfesorZvanje ' || i
from generate_series(1, 20) as i;

-- Insert random rows into predmet
insert into projekt.predmet (naziv, ects, semestar)
select 
    'Predmet ' || i,
    5 + (random() * 3)::int,
    (random() * 5 + 1)::int
from generate_series(1, 30) as i;

-- Insert rows into student_odabir with proper ranking up to maximum of 10 mentors per student
do $$
declare
    student_id int;
    mentor_ids int[];
    mentor_id int;  -- Declare the variable for use in FOREACH
    i int := 0;
begin
    for student_id in select id from projekt.student loop
        -- Randomly select mentors for the student (up to 10 mentors)
        mentor_ids := array(
            select id from projekt.profesor order by random() limit (random() * 10)::int + 1
        );

        -- Assign ranks starting at 0
        i := 0;
        foreach mentor_id in array mentor_ids loop
            begin
                insert into projekt.student_odabir (student_id, profesor_id, rank)
                values (student_id, mentor_id, i);
                i := i + 1;
            exception when others then
                -- Skip if there's a conflict (e.g., unique constraint or trigger)
                continue;
            end;
        end loop;
    end loop;
end $$;


-- insert into predmet_student
-- when student is on a predmet then he should either have no grade and status upisan or he should have a grade and status obavljen
-- if student is not on a predmet then there is no row in this table for that student and predmet
do $$
declare
    student_id int;
    predmet_ids int[];
    predmet_id int;  -- Declare the variable for use in FOREACH
    status varchar(10);
    grade int;
begin
    -- Loop through each student
    for student_id in select id from projekt.student loop
        -- Randomly select predmet for the student (up to 10 predmet)
        predmet_ids := array(
            select id from projekt.predmet order by random() limit (random() * 10)::int + 1
        );

        -- Assign status and grades for each predmet
        foreach predmet_id in array predmet_ids loop
            begin
                -- Randomly determine status and grade
                if random() > 0.5 then
                    status := 'upisan';
                    grade := NULL; -- No grade for 'upisan' status
                else
                    status := 'obavljen';
                    grade := (random() * 5 + 1)::int; -- Random grade between 1 and 5
                end if;

                -- Insert into predmet_student
                insert into projekt.predmet_student (student_id, predmet_id, ocjena, upis)
                values (student_id, predmet_id, grade, status);
            exception when others then
                -- Skip if there's a conflict (e.g., unique constraint or trigger)
                continue;
            end;
        end loop;
    end loop;
end $$;


-- insert into profesor_predmet
-- this table represents subjects which mentor prioritizes over some other ones, this is important in the pairing alghorithm
-- insert random up to 4 subjects for each mentor
do $$
declare
    mentor_id int;
    predmet_ids int[];
    predmet_id int;  -- Declare the variable for use in FOREACH
begin
    -- Loop through each mentor
    for mentor_id in select id from projekt.profesor loop
        -- Randomly select predmet for the mentor (up to 4 predmet)
        predmet_ids := array(
            select id from projekt.predmet order by random() limit (random() * 4)::int + 1
        );

        -- Assign predmet for each mentor
        foreach predmet_id in array predmet_ids loop
            begin
                -- Insert into profesor_predmet
                insert into projekt.profesor_predmet (profesor_id, predmet_id)
                values (mentor_id, predmet_id);
            exception when others then
                -- Skip if there's a conflict (e.g., unique constraint or trigger)
                continue;
            end;
        end loop;
    end loop;
end $$;