package com.yogesh.automation.practicePrograms;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

public class Lambda_ForEachList {

	public static void main(String[] args) {

		List<String> list = new ArrayList<String>();
		list.add("sagar");
		list.add("harshada");
		list.add("vivasvan");

		list.forEach((n) -> System.out.println(n));

		Iterator<String> itr = list.iterator();
		while (itr.hasNext()) {
			System.out.println(itr.next());
		}
	}
}
