alter table projekt.predmet_student add constraint status_enum check (upis in ('obavljen', 'upisan'));


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


-- drop table if  exists projekt.profesor_predmet;
create table projekt.profesor_predmet (
    profesor_id int not null,
    predmet_id int not null,
    primary key (profesor_id, predmet_id),
    foreign key (profesor_id) references projekt.profesor(id),
    foreign key (predmet_id) references projekt.predmet(id)
);

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


create or replace function projekt.get_subjects_by_mentor(id_profesora integer)
    returns table (predmet_id integer, naziv varchar) as $$
begin
    return query
    select pp.predmet_id, p.naziv
    from projekt.profesor_predmet pp
    join projekt.predmet p on pp.predmet_id = p.id
    where pp.profesor_id = id_profesora;
end;
$$ language plpgsql;