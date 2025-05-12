import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Instructor } from './instructor.entity'
import { Institution } from 'src/modules/institutions/entities/institution.entity'

@Entity('instructor_institution')
export class InstructorInstitution {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'int' })
    instructorId: number

    @Column({ type: 'int' })
    institutionId: number

    @Column({ type: 'boolean', default: false })
    status: boolean

    @ManyToOne(
        () => Instructor,
        (instructor) => instructor.instructorInstitutions
    )
    instructor: Instructor

    @ManyToOne(
        () => Institution,
        (institution) => institution.instructorInstitutions
    )
    institution: Institution
}
