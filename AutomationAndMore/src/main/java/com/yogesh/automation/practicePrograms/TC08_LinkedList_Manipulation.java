package com.yogesh.automation.practicePrograms;

import java.util.Collections;
import java.util.Comparator;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Set;
import java.util.stream.Collectors;

public class TC08_LinkedList_Manipulation {

	public static void main(String[] args) {

		LinkedList<String> linkedList1 = new LinkedList<>();
		linkedList1.add("a");
		linkedList1.add("r");
		linkedList1.add("g");
		linkedList1.add("g");
		linkedList1.add("h");
		linkedList1.add("j");
		linkedList1.add("l");
		linkedList1.add("p");
		linkedList1.add("o");
		linkedList1.add("b");
		linkedList1.add("c");
		linkedList1.add("s");
		linkedList1.add("r");
		linkedList1.add("a");
		linkedList1.add("w");

		System.out.println(linkedList1);

		/**
		 * Get count
		 */
		System.out.println(linkedList1.stream().count());

		/**
		 * duplicate boolean
		 */
		System.out.println(linkedList1.stream().distinct().collect(Collectors.toSet()));

		/**
		 * Prefix "Hello " to all objects in linked list
		 */
		LinkedList<String> linkedList3 = new LinkedList<>();
		Iterator<String> itr = linkedList1.iterator();
		while (itr.hasNext()) {
			String value = itr.next();
			linkedList3.add("Hello " + value);
		}
		System.out.println("Prefix Hello is adeded to all objects in linked list " + linkedList3);

		/**
		 * Max, Min
		 */

		System.out.println("Max " + Collections.max(linkedList1));
		System.out.println("Min " + Collections.min(linkedList1));

	}
}
