SELECT json_object(
	'id',id,
	'text',text,
	'paragraph',
	(SELECT json_object('id',id,'text',text,'speaker',speaker) 
		FROM paragraph 
		WHERE paragraph.id = annotation.paragraph_id),
	'start_meta',
	(SELECT json_object('id',id,'is_start',is_start,'text_offset',text_offset,'parent_index',parent_index,'parent_tag_name',parent_tag_name)
		FROM highlight_meta
		WHERE highlight_meta.id = annotation.start_meta_id),
	'end_meta',
	(SELECT json_object('id',id,'is_start',is_start,'text_offset',text_offset,'parent_index',parent_index,'parent_tag_name',parent_tag_name)
		FROM highlight_meta
		WHERE highlight_meta.id = annotation.end_meta_id),
	'code',
	(SELECT json_object('id',id)
		FROM code 
		WHERE code.id = (SELECT * FROM code JOIN))
) FROM annotation 